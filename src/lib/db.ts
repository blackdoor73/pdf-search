/**
 * Neon Postgres access for telemetry + admin analytics.
 *
 * Uses the HTTP driver (@neondatabase/serverless) — no connection pooling
 * needed on Vercel serverless. All access is behind isDbConfigured() so the
 * app degrades gracefully when DATABASE_URL is not set.
 */

import { neon } from "@neondatabase/serverless";

export type Sql = ReturnType<typeof neon>;

let _sql: Sql | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql(): Sql {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not configured");
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

// ─── Schema bootstrap ──────────────────────────────────────────────────────────
// Idempotent CREATE IF NOT EXISTS, run at most once per lambda instance.

let _schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!_schemaReady) {
    _schemaReady = migrate().catch((err) => {
      _schemaReady = null; // allow retry on next request
      throw err;
    });
  }
  return _schemaReady;
}

async function migrate(): Promise<void> {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
      anon_id    TEXT NOT NULL,
      session_id TEXT NOT NULL,
      event      TEXT NOT NULL,
      page       TEXT,
      referrer   TEXT,
      country    TEXT,
      device     TEXT,
      browser    TEXT,
      props      JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS events_ts_idx ON events (ts DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS events_event_ts_idx ON events (event, ts DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS events_anon_ts_idx ON events (anon_id, ts)`;
}
