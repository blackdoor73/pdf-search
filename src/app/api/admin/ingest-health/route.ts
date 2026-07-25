/**
 * Ingestion health probe. Auth enforced by middleware (/api/admin/* matcher).
 *
 * Answers the question "is telemetry actually being written?" — which the
 * public /api/track endpoint cannot answer, because it returns 204 on every
 * path by design (no detail is ever leaked to callers).
 *
 * Reports, per table: newest row timestamp and recent row counts. Then runs
 * a real write against the events table and rolls it back, so a failing
 * write path surfaces its actual Postgres error here instead of only in the
 * server logs.
 *
 * GET ?canary=1 to include the write test (skipped by default — it is a
 * write, even though it undoes itself).
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Error shape safe to show an authenticated admin. */
function describe(err: unknown): { message: string; code?: string } {
  const e = err as { message?: string; code?: string } | undefined;
  return {
    message: String(e?.message ?? err).slice(0, 500),
    ...(e?.code ? { code: e.code } : {}),
  };
}

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({
      configured: false,
      hint: "DATABASE_URL is not set in this environment.",
    });
  }

  const out: Record<string, unknown> = { configured: true, now: new Date().toISOString() };

  // Schema bootstrap runs before every ingestion write, so a failure here
  // takes down the whole pipeline — check it explicitly and separately.
  try {
    await ensureSchema();
    out.schema = { ok: true };
  } catch (err) {
    out.schema = { ok: false, error: describe(err) };
    return NextResponse.json(out); // nothing below can succeed
  }

  const sql = getSql();

  for (const table of ["events", "pdf_documents", "feedback"] as const) {
    try {
      // Table names are a fixed literal list — never user input.
      const rows = (await sql.query(
        `SELECT max(ts) AS last_ts,
                count(*) FILTER (WHERE ts > now() - interval '1 hour')  AS h1,
                count(*) FILTER (WHERE ts > now() - interval '24 hours') AS h24,
                count(*) FILTER (WHERE ts > now() - interval '7 days')   AS d7,
                count(*) AS total
         FROM ${table}`
      )) as Record<string, unknown>[];
      const r = rows[0] ?? {};
      out[table] = {
        lastTs: r.last_ts ? String(r.last_ts) : null,
        lastAgeMinutes: r.last_ts
          ? Math.round((Date.now() - new Date(String(r.last_ts)).getTime()) / 60_000)
          : null,
        count1h: Number(r.h1 ?? 0),
        count24h: Number(r.h24 ?? 0),
        count7d: Number(r.d7 ?? 0),
        total: Number(r.total ?? 0),
      };
    } catch (err) {
      out[table] = { error: describe(err) };
    }
  }

  // Event-name breakdown for the last 24h — shows which client events are
  // arriving and which have gone quiet.
  try {
    const rows = (await sql.query(
      `SELECT event, count(*) AS n FROM events
       WHERE ts > now() - interval '24 hours'
       GROUP BY event ORDER BY n DESC`
    )) as Record<string, unknown>[];
    out.events24hByName = Object.fromEntries(
      rows.map((r) => [String(r.event), Number(r.n ?? 0)])
    );
  } catch (err) {
    out.events24hByName = { error: describe(err) };
  }

  if (req.nextUrl.searchParams.get("canary") === "1") {
    const canaryId = `canary-${crypto.randomUUID()}`;
    try {
      await sql.query(
        `INSERT INTO events (event_id, ts, anon_id, session_id, event, props)
         VALUES ($1, now(), 'canary', 'canary', 'canary', '{}'::jsonb)`,
        [canaryId]
      );
      await sql.query(`DELETE FROM events WHERE event_id = $1`, [canaryId]);
      out.writeCanary = { ok: true };
    } catch (err) {
      // This is the decisive signal when reads work but nothing is stored.
      out.writeCanary = { ok: false, error: describe(err) };
    }
  }

  return NextResponse.json(out);
}
