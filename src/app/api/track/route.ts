/**
 * Telemetry ingestion endpoint.
 *
 * Accepts batched anonymous events from the client tracker (fetch or
 * sendBeacon). Enriches with country (Vercel geo header) and a coarse
 * device/browser parse, then bulk-inserts into Neon.
 *
 * Accuracy filters (see docs/ANALYTICS_AUDIT.md):
 * - Bots/crawlers dropped by UA — Googlebot renders JS and would otherwise
 *   mint a fresh "user" on every crawl.
 * - Admin traffic dropped when a valid admin session cookie accompanies
 *   the request (override with TRACK_ADMIN_TRAFFIC=true), so checking the
 *   dashboard doesn't inflate the dashboard.
 * - Idempotent: client event UUIDs + ON CONFLICT DO NOTHING, so beacon
 *   retries never double-count.
 *
 * Privacy: set TRACK_SEARCH_TERMS=false to strip raw search query text at
 * ingestion; query length + match counts are always kept.
 *
 * Design constraints:
 * - Always responds 204 — never leaks validation details to callers.
 * - No-ops gracefully when DATABASE_URL is unset.
 * - Per-IP in-memory rate limit (best-effort on serverless; the batch cap
 *   and payload cap are the hard limits).
 */

import { NextRequest } from "next/server";
import { trackBatchSchema, MAX_QUERY_LEN } from "@/lib/analytics/events";
import { isBotUserAgent } from "@/lib/analytics/bots";
import { parseUa } from "@/lib/analytics/ua";
import { hashIp } from "@/lib/analytics/ipHash";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin/auth";
import { ensureSchema, getSql, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;
const RATE_LIMIT_PER_MIN = 240;

const ipHits = new Map<string, { count: number; windowStart: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now - entry.windowStart > 60_000) {
    ipHits.set(ip, { count: 1, windowStart: now });
    if (ipHits.size > 5000) ipHits.clear(); // memory guard
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_PER_MIN;
}

/** Vercel geo headers + request-derived enrichment shared by both tables. */
function readGeo(req: NextRequest) {
  const dec = (v: string | null): string | null => {
    if (!v) return null;
    try {
      return decodeURIComponent(v); // Vercel URI-encodes city names
    } catch {
      return v;
    }
  };
  const flt = (v: string | null): number | null => {
    const n = v ? parseFloat(v) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  return {
    country: req.headers.get("x-vercel-ip-country"),
    region: dec(req.headers.get("x-vercel-ip-country-region")),
    city: dec(req.headers.get("x-vercel-ip-city")),
    lat: flt(req.headers.get("x-vercel-ip-latitude")),
    lon: flt(req.headers.get("x-vercel-ip-longitude")),
    tzHeader: req.headers.get("x-vercel-ip-timezone"),
  };
}

async function isAdminTraffic(req: NextRequest): Promise<boolean> {
  if (process.env.TRACK_ADMIN_TRAFFIC === "true") return false;
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    return await verifySessionToken(token);
  } catch {
    return false;
  }
}

const NO_CONTENT = new Response(null, { status: 204 });

export async function POST(req: NextRequest) {
  try {
    if (!isDbConfigured()) return NO_CONTENT;

    const ua = req.headers.get("user-agent") ?? "";
    if (isBotUserAgent(ua)) return NO_CONTENT;
    if (await isAdminTraffic(req)) return NO_CONTENT;

    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > MAX_BODY_BYTES) return NO_CONTENT;

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (rateLimited(ip)) return NO_CONTENT;

    // sendBeacon may deliver as text/plain — parse manually.
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return NO_CONTENT;

    const parsed = trackBatchSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return NO_CONTENT;
    const batch = parsed.data;

    const geo = readGeo(req);
    const ipHash = await hashIp(ip);
    const tz = batch.tz ?? geo.tzHeader;
    const lang =
      batch.lang ??
      req.headers.get("accept-language")?.split(",")[0]?.trim().slice(0, 32) ??
      null;
    const { device, browser, os } = parseUa(ua);
    const keepSearchTerms = process.env.TRACK_SEARCH_TERMS !== "false";

    const now = Date.now();
    const idArr: (string | null)[] = [];
    const tsArr: string[] = [];
    const eventArr: string[] = [];
    const propsArr: string[] = [];
    for (const ev of batch.events) {
      // Clamp client timestamps to [now - 10min, now] against clock skew.
      const ts =
        ev.ts && ev.ts <= now && ev.ts > now - 10 * 60_000 ? ev.ts : now;
      idArr.push(ev.id ?? null);
      tsArr.push(new Date(ts).toISOString());
      eventArr.push(ev.e);
      const props = { ...ev.props };
      if (typeof props.q === "string") {
        props.q = props.q.slice(0, MAX_QUERY_LEN);
        props.qLen = props.q.length;
        if (!keepSearchTerms) delete props.q;
      }
      propsArr.push(JSON.stringify(props));
    }

    await ensureSchema();
    const sql = getSql();
    await sql`
      INSERT INTO events (event_id, ts, anon_id, session_id, event, page, referrer,
                          country, region, city, lat, lon,
                          device, browser, os, lang, tz, ip_hash, props)
      SELECT event_id, ts, ${batch.aid}, ${batch.sid}, event, ${batch.page ?? null},
             ${batch.ref ?? null}, ${geo.country}, ${geo.region}, ${geo.city},
             ${geo.lat}, ${geo.lon}, ${device}, ${browser}, ${os},
             ${lang}, ${tz}, ${ipHash}, props
      FROM unnest(
        ${idArr}::text[],
        ${tsArr}::timestamptz[],
        ${eventArr}::text[],
        ${propsArr}::jsonb[]
      ) AS t(event_id, ts, event, props)
      ON CONFLICT (event_id) WHERE event_id IS NOT NULL DO NOTHING
    `;

    return NO_CONTENT;
  } catch {
    // Ingestion failures must never propagate to users.
    return NO_CONTENT;
  }
}
