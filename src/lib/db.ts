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
      if (isConcurrentMigrationRace(err)) return; // table now exists — a racing request just finished it
      _schemaReady = null; // allow retry on next request
      throw err;
    });
  }
  return _schemaReady;
}

/**
 * Postgres's `CREATE TABLE/INDEX IF NOT EXISTS` isn't safe under concurrent
 * DDL: two callers can both see "doesn't exist" and race to create it. The
 * loser gets a catalog unique-violation (classically on pg_type, since every
 * table implicitly registers a row type there) even though the object it
 * wanted now exists. That's a false failure — safe to swallow.
 */
function isConcurrentMigrationRace(err: unknown): boolean {
  const code = (err as { code?: string } | undefined)?.code;
  return code === "23505" || code === "42P07" || code === "42710";
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
  // Idempotency key: client-generated event UUID. Nullable so legacy rows
  // remain valid; the partial unique index backs ON CONFLICT DO NOTHING.
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS event_id TEXT`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS events_event_id_key
    ON events (event_id) WHERE event_id IS NOT NULL
  `;
  // Analytics V2 enrichment: hashed visitor IP (never the raw IP), full
  // Vercel geo, OS, language, timezone. Nullable so legacy rows stay valid.
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS ip_hash TEXT`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS region TEXT`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS city TEXT`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS lat REAL`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS lon REAL`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS os TEXT`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS lang TEXT`;
  await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS tz TEXT`;
  await sql`
    CREATE INDEX IF NOT EXISTS events_ip_hash_idx
    ON events (ip_hash) WHERE ip_hash IS NOT NULL
  `;

  // Per-document metadata rows (client-extracted; never file content).
  // Populated from pdf_meta telemetry events at ingestion.
  await sql`
    CREATE TABLE IF NOT EXISTS pdf_documents (
      id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      event_id      TEXT,
      ts            TIMESTAMPTZ NOT NULL DEFAULT now(),
      anon_id       TEXT NOT NULL,
      session_id    TEXT NOT NULL,
      ip_hash       TEXT,
      country       TEXT,
      region        TEXT,
      city          TEXT,
      filename      TEXT NOT NULL,
      size_bytes    BIGINT,
      page_count    INT,
      sha256        TEXT,
      title         TEXT,
      author        TEXT,
      subject       TEXT,
      keywords      TEXT,
      creator       TEXT,
      producer      TEXT,
      pdf_created   TEXT,
      pdf_modified  TEXT,
      source        TEXT NOT NULL DEFAULT 'file',
      status        TEXT NOT NULL DEFAULT 'ok',
      processing_ms INT
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS pdf_documents_event_id_key
    ON pdf_documents (event_id) WHERE event_id IS NOT NULL
  `;
  await sql`CREATE INDEX IF NOT EXISTS pdf_documents_ts_idx ON pdf_documents (ts DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS pdf_documents_sha_idx ON pdf_documents (sha256)`;
  await sql`CREATE INDEX IF NOT EXISTS pdf_documents_fname_idx ON pdf_documents (lower(filename))`;

  // In-app feedback. email is optional (anonymous feedback allowed); the
  // raw IP is never stored, only its hash. status: 'new' | 'resolved'.
  await sql`
    CREATE TABLE IF NOT EXISTS feedback (
      id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      ts         TIMESTAMPTZ NOT NULL DEFAULT now(),
      category   TEXT NOT NULL,
      message    TEXT NOT NULL,
      email      TEXT,
      page       TEXT,
      anon_id    TEXT,
      session_id TEXT,
      ip_hash    TEXT,
      country    TEXT,
      browser    TEXT,
      os         TEXT,
      device     TEXT,
      status     TEXT NOT NULL DEFAULT 'new',
      admin_note TEXT
    )
  `;
  // Search context for "issue" reports: query, options, and per-file metadata
  // (page counts, text-layer verdict, OCR outcome) plus an opt-in text excerpt.
  // Never PDF bytes. Nullable so every existing row stays valid.
  await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS diagnostics JSONB`;
  await sql`CREATE INDEX IF NOT EXISTS feedback_ts_idx ON feedback (ts DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS feedback_status_ts_idx ON feedback (status, ts DESC)`;
}
