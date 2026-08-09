/**
 * Public feedback ingestion.
 *
 * POST /api/feedback  body: { category, message, email?, page?, website?, elapsedMs? }
 *
 * Mirrors the /api/track hardening: nodejs runtime, body cap, bot-UA drop,
 * per-IP rate limit, honeypot + too-fast trap. Enriches server-side with a
 * hashed IP, geo country, and parsed UA. Stores in Neon; fires a Resend
 * notification (no-op unless configured). Responses are opaque { ok } —
 * no field detail, and never the notify address.
 */

import { NextRequest, NextResponse } from "next/server";
import { feedbackSchema } from "@/lib/feedback/schema";
import { notifyFeedback } from "@/lib/feedback/notify";
import { isBotUserAgent } from "@/lib/analytics/bots";
import { parseUa } from "@/lib/analytics/ua";
import { hashIp } from "@/lib/analytics/ipHash";
import { checkRateLimit } from "@/lib/security";
import { ensureSchema, getSql, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

/**
 * 64KB, up from 16KB: an "issue" report carries diagnostics for up to 5 files,
 * each with a 500-char text excerpt, which can exceed 16KB and used to be
 * rejected with an opaque 400.
 */
const MAX_BODY_BYTES = 64 * 1024;
const MIN_ELAPSED_MS = 1500; // faster than this = almost certainly a bot

/**
 * Responses are built per call, NOT shared module-level constants.
 *
 * A NextResponse carries a single-use body stream, so a module-scope instance is
 * drained by the first request that returns it and every later use sends an
 * empty body. In practice that meant whichever response object was created
 * first got served for everything — invalid payloads and rate-limited requests
 * both came back as `200 {"ok":true}`.
 */
const OK = () => NextResponse.json({ ok: true });
const BAD = () => NextResponse.json({ ok: false }, { status: 400 });
const LIMITED = () => NextResponse.json({ ok: false }, { status: 429 });

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (isBotUserAgent(ua)) return OK(); // don't tip off scrapers

    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > MAX_BODY_BYTES) return BAD();

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(`feedback:${ip}`, 5, 10 * 60_000).allowed) return LIMITED();

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return BAD();

    const parsed = feedbackSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return BAD();
    const input = parsed.data;

    // Honeypot filled, or submitted implausibly fast → silently accept
    // without storing, so bots get no signal.
    if (input.website || (input.elapsedMs != null && input.elapsedMs < MIN_ELAPSED_MS)) {
      return OK();
    }

    // No DB configured: accept gracefully (the widget still confirms).
    if (!isDbConfigured()) return OK();

    const { device, browser, os } = parseUa(ua);
    const ipHash = await hashIp(ip);
    const country = req.headers.get("x-vercel-ip-country");
    const page =
      input.page ??
      req.headers.get("referer")?.slice(0, 300) ??
      null;
    const email = input.email ? input.email : null;

    await ensureSchema();
    const sql = getSql();
    await sql`
      INSERT INTO feedback (category, message, email, page, ip_hash, country, browser, os, device,
                            anon_id, session_id, diagnostics)
      VALUES (${input.category}, ${input.message}, ${email}, ${page},
              ${ipHash}, ${country}, ${browser}, ${os}, ${device},
              ${input.anonId ?? null}, ${input.sessionId ?? null},
              ${input.diagnostics ? JSON.stringify(input.diagnostics) : null})
    `;

    notifyFeedback({
      category: input.category,
      message: input.message,
      email,
      page,
      country,
      browser,
      os,
      device,
      diagnostics: input.diagnostics,
    });

    return OK();
  } catch (err) {
    // Never surface internals to the client — but log them, or a broken
    // feedback pipeline looks identical to nobody sending feedback.
    console.error("[feedback] submission failed", err);
    return BAD();
  }
}
