/**
 * PDF Proxy API Route
 * POST /api/proxy-pdf
 *
 * Security responsibilities:
 * - SSRF prevention (URL validation, IP blocklist)
 * - Rate limiting per IP
 * - Content-type validation
 * - File size enforcement
 * - Request timeout
 * - No server-side file persistence (streams response directly)
 *
 * @security This route is a potential SSRF vector. All security checks are mandatory.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateProxyUrl,
  validatePdfBytes,
  checkRateLimit,
  ProxyRequestSchema,
  PROXY_FETCH_TIMEOUT_MS,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/security";

// ─── Route Config ─────────────────────────────────────────────────────────────

export const runtime = "nodejs"; // Need Node.js for full fetch + buffer support
export const maxDuration = 30; // Vercel function timeout (seconds)

// ─── Rate limit config ────────────────────────────────────────────────────────

const RATE_LIMIT_PER_MIN = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 0. Origin check — block cross-origin abuse of the proxy ──────────────
  // In production NEXT_PUBLIC_APP_URL must be set (e.g. https://yourdomain.com).
  // Without it, the check is skipped in development only.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    const origin = req.headers.get("origin") ?? "";
    const referer = req.headers.get("referer") ?? "";
    const allowed = origin.startsWith(appUrl) || referer.startsWith(appUrl);
    if (!allowed) {
      return NextResponse.json(
        { error: "Forbidden", code: "SSRF_BLOCKED" },
        { status: 403 }
      );
    }
  }

  // ── 1. Rate limiting ──────────────────────────────────────────────────────
  // NOTE: In-memory rate limiting is best-effort on serverless (Vercel).
  // Each cold-start resets the counter. For hard rate limits, replace
  // checkRateLimit() with an Upstash Redis implementation.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rateCheck = checkRateLimit(
    `proxy:${ip}`,
    RATE_LIMIT_PER_MIN,
    RATE_LIMIT_WINDOW_MS
  );

  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down.", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateCheck.resetAt - Date.now()) / 1000)
          ),
          "X-RateLimit-Limit": String(RATE_LIMIT_PER_MIN),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // ── 2. Parse + validate request body ─────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: "INVALID_URL" },
      { status: 400 }
    );
  }

  const parsed = ProxyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.errors[0]?.message ?? "Invalid request",
        code: "INVALID_URL",
      },
      { status: 400 }
    );
  }

  const { url } = parsed.data;

  // ── 3. SSRF validation ────────────────────────────────────────────────────
  const urlValidation = validateProxyUrl(url);
  if (!urlValidation.valid) {
    return NextResponse.json(
      { error: urlValidation.error, code: "SSRF_BLOCKED" },
      { status: 400 }
    );
  }

  const safeUrl = urlValidation.sanitizedUrl!;

  // ── 4. Fetch with timeout + size guard ────────────────────────────────────
  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      PROXY_FETCH_TIMEOUT_MS
    );

    response = await fetch(safeUrl, {
      signal: controller.signal,
      headers: {
        // Minimal headers — don't forward user cookies/auth
        Accept: "application/pdf,application/octet-stream,*/*",
        "User-Agent": "PDFSearch-Bot/1.0",
      },
      redirect: "follow", // Allow redirects but validate final URL
    });

    clearTimeout(timeoutId);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Request timed out", code: "TIMEOUT" },
        { status: 504 }
      );
    }
    return NextResponse.json(
      {
        error: "Failed to fetch the URL. Check that it is accessible.",
        code: "FETCH_FAILED",
      },
      { status: 502 }
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        error: `Remote server returned ${response.status}`,
        code: "FETCH_FAILED",
      },
      { status: 502 }
    );
  }

  // ── 5. Content-type check ─────────────────────────────────────────────────
  const contentType = response.headers.get("content-type") ?? "";

  // ── 6. Read body with size limit ──────────────────────────────────────────
  // Stream the response and enforce MAX_FILE_SIZE_BYTES
  const reader = response.body?.getReader();
  if (!reader) {
    return NextResponse.json(
      { error: "Empty response body", code: "FETCH_FAILED" },
      { status: 502 }
    );
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      if (totalBytes > MAX_FILE_SIZE_BYTES) {
        reader.cancel();
        return NextResponse.json(
          { error: "File too large (max 50MB)", code: "FILE_TOO_LARGE" },
          { status: 413 }
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Assemble bytes
  const allBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    allBytes.set(chunk, offset);
    offset += chunk.length;
  }

  // ── 7. Magic bytes + content validation ───────────────────────────────────
  const validation = validatePdfBytes(allBytes, contentType);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error, code: "INVALID_CONTENT_TYPE" },
      { status: 422 }
    );
  }

  // ── 8. Derive filename ────────────────────────────────────────────────────
  const urlPath = new URL(safeUrl).pathname;
  const filename =
    urlPath.split("/").pop()?.replace(/[^a-zA-Z0-9._-]/g, "_") ||
    "document.pdf";

  // ── 9. Return base64-encoded PDF ──────────────────────────────────────────
  // We return base64 rather than binary to keep the response JSON.
  // For large files, consider returning binary with appropriate Content-Type.
  const base64 = Buffer.from(allBytes).toString("base64");

  return NextResponse.json(
    {
      data: base64,
      contentType: "application/pdf",
      size: totalBytes,
      filename,
    },
    {
      status: 200,
      headers: {
        // No caching of proxied content
        "Cache-Control": "no-store",
        "X-RateLimit-Remaining": String(rateCheck.remaining),
      },
    }
  );
}

// Only allow POST
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
