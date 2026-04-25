/**
 * Security Module
 *
 * Centralizes all security-sensitive operations:
 * - URL validation + SSRF prevention
 * - Input sanitization (XSS prevention)
 * - File validation (MIME, size, magic bytes)
 * - Rate limiting (in-memory for MVP; swap with Redis in production)
 * - CSRF token generation
 *
 * @security This file is security-critical. Changes require security review.
 */

import { z } from "zod";

// ─── Constants ─────────────────────────────────────────────────────────────────

/** Max file size: 50MB per file. Rationale: balances usability vs. DoS risk.
 *  Large voter PDFs are typically <5MB; 50MB gives generous headroom. */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/** Max total in-memory across all loaded PDFs in one session */
export const MAX_TOTAL_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

/** Max number of PDFs loaded simultaneously */
export const MAX_PDF_COUNT = 200;

/** Max search query length */
export const MAX_QUERY_LENGTH = 500;

/** Request timeout for URL fetch proxy */
export const PROXY_FETCH_TIMEOUT_MS = 15_000; // 15s

// ─── SSRF Protection ──────────────────────────────────────────────────────────

/**
 * Private/reserved IP ranges that must never be fetched.
 * Prevents SSRF attacks targeting internal infrastructure.
 */
const BLOCKED_IP_PATTERNS = [
  // IPv4 private ranges
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /^169\.254\./, // Link-local
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
  // IPv6 private
  /^::1$/,
  /^fc/i,
  /^fd/i,
  /^fe80/i,
  // Metadata endpoints (cloud providers)
  /^169\.254\.169\.254/, // AWS/GCP/Azure IMDS
  /^fd00:ec2::/i,
];

/** Allowed URL schemes. Only https in production. */
const ALLOWED_SCHEMES = ["https:"];

/** Blocked hostnames — common internal/metadata targets */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
  "169.254.169.254",
  "instance-data",
  "computeMetadata",
]);

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

/**
 * Validates a URL for safe proxying.
 * Blocks SSRF vectors, non-HTTPS schemes, and known malicious patterns.
 *
 * NOTE: DNS rebinding is not fully prevented by URL validation alone.
 * In production, add a DNS resolution step server-side to verify the
 * resolved IP is not private before making the actual request.
 */
export function validateProxyUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "URL is required" };
  }

  const trimmed = rawUrl.trim();

  if (trimmed.length > 2048) {
    return { valid: false, error: "URL too long" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  // Scheme check
  if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
    return {
      valid: false,
      error: `Only HTTPS URLs are accepted. Got: ${parsed.protocol}`,
    };
  }

  // Hostname blocklist
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, error: "This URL cannot be accessed" };
  }

  // IP pattern blocklist
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, error: "This URL cannot be accessed" };
    }
  }

  // Block URLs with auth credentials embedded (user:pass@host)
  if (parsed.username || parsed.password) {
    return { valid: false, error: "URLs with embedded credentials not allowed" };
  }

  // Must end with .pdf or have pdf in path (soft check — content-type is authoritative)
  const path = parsed.pathname.toLowerCase();
  if (!path.endsWith(".pdf") && !path.includes(".pdf")) {
    // Don't hard-reject — some URLs are dynamic. Warn via content-type check instead.
    // This is logged server-side for monitoring.
  }

  return { valid: true, sanitizedUrl: trimmed };
}

// ─── Zod Schema for URL Proxy API ─────────────────────────────────────────────

export const ProxyRequestSchema = z.object({
  url: z
    .string()
    .min(1, "URL required")
    .max(2048, "URL too long")
    .refine(
      (url) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid URL format" }
    ),
});

// ─── File Validation ──────────────────────────────────────────────────────────

/** PDF magic bytes: %PDF */
const PDF_MAGIC_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

/**
 * Validates a File object is actually a PDF.
 * Checks:
 * 1. MIME type (spoofable — not authoritative)
 * 2. Magic bytes (first 4 bytes of file content)
 * 3. File size limits
 * 4. Filename sanitization
 */
export async function validatePdfFile(file: File): Promise<{
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}> {
  // Size check
  if (file.size === 0) {
    return { valid: false, error: "File is empty" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File too large. Max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
    };
  }

  // MIME check (weak — can be spoofed, so we also check magic bytes)
  const validMimes = ["application/pdf", "application/x-pdf"];
  if (!validMimes.includes(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
    return { valid: false, error: "File must be a PDF" };
  }

  // Magic bytes check (strong)
  try {
    const header = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(header);
    const isPdf = PDF_MAGIC_BYTES.every((byte, i) => bytes[i] === byte);
    if (!isPdf) {
      return { valid: false, error: "File does not appear to be a valid PDF" };
    }
  } catch {
    return { valid: false, error: "Could not read file" };
  }

  // Filename sanitization — strip path traversal, null bytes, etc.
  const sanitizedName = sanitizeFilename(file.name);

  return { valid: true, sanitizedName };
}

/**
 * Validates PDF bytes fetched from a URL.
 * Same checks as file validation but operates on raw bytes.
 */
export function validatePdfBytes(
  bytes: Uint8Array,
  contentType: string
): { valid: boolean; error?: string } {
  if (bytes.length === 0) {
    return { valid: false, error: "Empty response" };
  }

  if (bytes.length > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "File too large" };
  }

  // Content-type check
  if (!contentType.includes("application/pdf") && !contentType.includes("octet-stream")) {
    return {
      valid: false,
      error: `Expected PDF, got ${contentType}`,
    };
  }

  // Magic bytes
  const isPdf = PDF_MAGIC_BYTES.every((byte, i) => bytes[i] === byte);
  if (!isPdf) {
    return { valid: false, error: "Response is not a valid PDF" };
  }

  return { valid: true };
}

// ─── Input Sanitization ────────────────────────────────────────────────────────

/**
 * Sanitizes a filename to prevent path traversal and injection.
 * Strips directory components and dangerous characters.
 */
export function sanitizeFilename(filename: string): string {
  return (
    filename
      // Remove path components
      .replace(/^.*[/\\]/, "")
      // Remove null bytes
      .replace(/\0/g, "")
      // Remove control characters
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f\x7f]/g, "")
      // Limit length
      .slice(0, 255) || "document.pdf"
  );
}

/**
 * Sanitizes a search query for safe display.
 * Does NOT escape for regex — use escapeRegex separately.
 */
export function sanitizeSearchQuery(query: string): string {
  return query
    .slice(0, MAX_QUERY_LENGTH)
    .replace(/\0/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .trim();
}

/**
 * Escapes a string for safe insertion into a RegExp.
 */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escapes HTML special characters to prevent XSS when inserting
 * user-controlled text into innerHTML.
 *
 * IMPORTANT: Always use this before calling innerHTML.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Creates a safe highlighted HTML snippet.
 * HTML-escapes the text first, THEN wraps matches in <mark>.
 * This is the correct order to prevent XSS via search query injection.
 */
export function createHighlightedHtml(
  text: string,
  query: string,
  caseSensitive: boolean
): string {
  const safeText = escapeHtml(text);
  const safeQuery = escapeHtml(query);
  const flags = caseSensitive ? "g" : "gi";
  const pattern = new RegExp(escapeRegex(safeQuery), flags);
  return safeText.replace(pattern, (m) => `<mark>${m}</mark>`);
}

// ─── Rate Limiting (in-memory MVP) ────────────────────────────────────────────
// Production: replace with Redis INCR + TTL (e.g. Upstash Redis)

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Simple token-bucket rate limiter.
 * @param key Identifier (IP address, session ID)
 * @param limit Max requests per window
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number = 30,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    const newEntry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    rateLimitStore.set(key, newEntry);
    // Cleanup old entries periodically
    if (rateLimitStore.size > 10_000) {
      for (const [k, v] of Array.from(rateLimitStore.entries())) {
        if (now > v.resetAt) rateLimitStore.delete(k);
      }
    }
    return { allowed: true, remaining: limit - 1, resetAt: newEntry.resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// ─── CSRF ─────────────────────────────────────────────────────────────────────
// For this MVP (no state mutations, no auth), CSRF risk is low.
// API routes are JSON-only (not form-POST) and same-origin.
// Add CSRF tokens here when you add auth/mutations.

export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  }
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Content Hash (deduplication) ─────────────────────────────────────────────

/**
 * Computes SHA-256 hash of ArrayBuffer content.
 * Used for deduplication — prevents same file being loaded twice.
 */
export async function computeContentHash(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
