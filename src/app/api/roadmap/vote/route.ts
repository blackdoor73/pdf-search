/**
 * Roadmap voting.
 *
 * POST /api/roadmap/vote  body: { slug, anonId }  → { ok, votes }
 * GET  /api/roadmap/vote?anonId=…                 → { ok, voted: number[] }
 *
 * Mirrors /api/feedback's hardening: nodejs runtime, body cap, bot-UA drop,
 * per-IP rate limit. One vote per (feature, anon_id) is enforced by a unique
 * index, not by checking first — ON CONFLICT DO NOTHING makes a duplicate a
 * silent no-op, which is what a double-tap or a retried request should be.
 *
 * Votes are deliberately NOT a security boundary: anon_id is a client value,
 * so someone determined can vote twice. That is an acceptable trade for
 * requiring no login on a signal that only orders a backlog.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isBotUserAgent } from "@/lib/analytics/bots";
import { hashIp } from "@/lib/analytics/ipHash";
import { checkRateLimit } from "@/lib/security";
import { ensureSchema, getSql, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 2 * 1024;

const voteSchema = z.object({
  slug: z.string().min(1).max(120),
  anonId: z.string().min(8).max(64),
});

// Built per call, never module-level: a NextResponse body is a single-use
// stream, so a shared instance serves an empty body to every later request.
const BAD = () => NextResponse.json({ ok: false }, { status: 400 });
const LIMITED = () => NextResponse.json({ ok: false }, { status: 429 });

export async function GET(req: NextRequest) {
  try {
    const anonId = req.nextUrl.searchParams.get("anonId") ?? "";
    if (!anonId || !isDbConfigured()) return NextResponse.json({ ok: true, voted: [] });

    await ensureSchema();
    const sql = getSql();
    const rows = (await sql`
      SELECT feature_id FROM feature_votes WHERE anon_id = ${anonId}
    `) as Record<string, unknown>[];
    return NextResponse.json({ ok: true, voted: rows.map((r) => Number(r.feature_id)) });
  } catch (err) {
    console.error("[roadmap] vote lookup failed", err);
    // An empty list degrades to "nothing voted yet" — the board still renders.
    return NextResponse.json({ ok: true, voted: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (isBotUserAgent(ua)) return NextResponse.json({ ok: true, votes: null });

    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > MAX_BODY_BYTES) return BAD();

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!checkRateLimit(`roadmap-vote:${ip}`, 20, 10 * 60_000).allowed) return LIMITED();

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return BAD();

    const parsed = voteSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return BAD();
    const { slug, anonId } = parsed.data;

    if (!isDbConfigured()) return NextResponse.json({ ok: true, votes: null });

    await ensureSchema();
    const sql = getSql();

    const found = (await sql`
      SELECT id FROM feature_requests WHERE slug = ${slug} AND published = true
    `) as Record<string, unknown>[];
    if (found.length === 0) return BAD();
    const featureId = Number(found[0].id);

    const ipHash = await hashIp(ip);
    const country = req.headers.get("x-vercel-ip-country");

    await sql`
      INSERT INTO feature_votes (feature_id, anon_id, ip_hash, country)
      VALUES (${featureId}, ${anonId}, ${ipHash}, ${country})
      ON CONFLICT (feature_id, anon_id) DO NOTHING
    `;

    const counted = (await sql`
      SELECT COUNT(*)::int AS votes FROM feature_votes WHERE feature_id = ${featureId}
    `) as Record<string, unknown>[];

    return NextResponse.json({ ok: true, votes: Number(counted[0]?.votes ?? 0) });
  } catch (err) {
    console.error("[roadmap] vote failed", err);
    return BAD();
  }
}
