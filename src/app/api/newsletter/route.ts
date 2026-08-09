/**
 * Newsletter signup — adds a contact to a Resend audience.
 *
 * POST /api/newsletter  body: { email, website? }
 *
 * No-ops gracefully (still returns { ok: true }) when RESEND_API_KEY /
 * RESEND_AUDIENCE_ID are unset. Honeypot + rate limit for abuse. The
 * audience id and API key are server-only and never returned.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isBotUserAgent } from "@/lib/analytics/bots";
import { checkRateLimit } from "@/lib/security";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().email().max(254),
  website: z.string().max(0).optional().or(z.literal("")), // honeypot
});

// Built per call, not shared: a NextResponse body is a single-use stream, so a
// module-scope instance is drained by the first request that returns it and
// every later use sends an empty body (see the note in ../feedback/route.ts).
const OK = () => NextResponse.json({ ok: true });
const BAD = () => NextResponse.json({ ok: false }, { status: 400 });

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (isBotUserAgent(ua)) return OK();

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(`newsletter:${ip}`, 5, 10 * 60_000).allowed) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return BAD();
    if (parsed.data.website) return OK(); // honeypot filled → silently accept

    const apiKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!apiKey || !audienceId) {
      // Not configured — accept without persisting so the UI still confirms.
      return NextResponse.json({ ok: true, configured: false });
    }

    const res = await fetch(
      `https://api.resend.com/audiences/${audienceId}/contacts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: parsed.data.email, unsubscribed: false }),
      }
    );

    // Resend returns 422 for an already-subscribed contact — treat as success.
    if (!res.ok && res.status !== 422) {
      console.error("[newsletter] resend error:", res.status);
      return NextResponse.json({ ok: false }, { status: 502 });
    }
    return OK();
  } catch {
    return BAD();
  }
}
