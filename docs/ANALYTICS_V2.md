# Analytics V2 — Visitors, Geography, Documents

Architecture notes for the enriched admin analytics shipped on the
`cleanup-hardening` branch. Extends the first-party telemetry pipeline
documented in `docs/ANALYTICS_AUDIT.md`.

## Product decisions

Two spec requirements conflicted with the product's privacy promise and were
deliberately adapted:

1. **PDF analytics are metadata-only.** File bytes are never uploaded or
   stored. The client extracts metadata with pdf.js (filename, size, page
   count, SHA-256 content hash, embedded title/author/subject/keywords/
   creator/producer/dates, processing duration) and sends it as a `pdf_meta`
   telemetry event. There is consequently no view/download of files in the
   admin — "delete" removes metadata rows.
2. **The raw visitor IP is never stored.** The ingestion endpoint stores
   `HMAC-SHA256(ip, IP_HASH_SECRET)` truncated to 32 hex chars (`ip_hash`).
   This is stable per visitor — supporting unique/returning counts,
   first/last seen, and per-visitor drill-down — but not reversible without
   the secret. Without any secret configured, `ip_hash` is NULL and visitor
   identity falls back to the anonymous cookie id (`anon_id`), which remains
   the primary identity everywhere.

The internal privacy contract lives in `src/lib/analytics/events.ts` and was
updated to reflect that document *metadata* (including filenames) is now
collected by design. Marketing copy was intentionally left untouched in this
effort (user decision, 2026-07-23).

## Data flow

```
Browser                              Server (Vercel)                 Neon Postgres
───────                              ───────────────                 ─────────────
track() batches (client.ts)  ──►  POST /api/track
  envelope: aid, sid, page,          │ bot filter, admin filter,
  ref, tz, lang, events[]            │ rate limit, zod validation
                                     │ enrich: geo headers, UA parse
                                     │ (ua.ts), hashIp (ipHash.ts)
  pdf_meta events ───────────────────┼──► INSERT pdf_documents
  all other events ──────────────────┴──► INSERT events
```

- **Geolocation**: Vercel's request headers (`x-vercel-ip-country`,
  `x-vercel-ip-country-region`, `x-vercel-ip-city`, `x-vercel-ip-latitude`,
  `x-vercel-ip-longitude`, `x-vercel-ip-timezone`). **No external
  geolocation API, no lookup cache needed** — the headers are free on every
  request. On non-Vercel environments they're absent and the columns stay
  NULL.
- **Timezone/language**: client-supplied (`Intl` timezone, `navigator.language`)
  with server fallback to the Vercel timezone header / `Accept-Language`.
- **OS/browser/device**: coarse regex parse in `src/lib/analytics/ua.ts`
  (unit-tested; Edge/Opera/Samsung before Chrome, iOS before macOS).
- **pdf_meta timing**: local files report in a background task (concurrency 2)
  right after being added; URL-sourced files report during the first search
  pass — the only moment their bytes exist client-side (`collectMeta`/`onMeta`
  in `src/lib/pdf/engine.ts`). One event per file, deduplicated by a
  client-side reported-ids set and the `event_id` unique index.
- DNT/GPC/webdriver opt-outs are honored client-side before anything is sent.

## Schema (created idempotently in `src/lib/db.ts`)

`events` — added columns (all nullable; legacy rows stay valid):
`ip_hash, region, city, lat REAL, lon REAL, os, lang, tz`
plus partial index `events_ip_hash_idx ON (ip_hash) WHERE ip_hash IS NOT NULL`.

`pdf_documents` — one row per uploaded document:

```sql
id BIGINT identity PK, event_id TEXT (partial unique), ts timestamptz,
anon_id, session_id, ip_hash, country, region, city,
filename NOT NULL, size_bytes BIGINT, page_count INT, sha256,
title, author, subject, keywords, creator, producer,
pdf_created, pdf_modified,          -- raw PDF date strings (unreliable format)
source ('file'|'url'), status ('ok'|'error'), processing_ms INT
-- indexes: ts DESC, sha256, lower(filename)
```

Visitor metrics are computed on read from `events` (matching the existing
`queries.ts` philosophy). If volume ever hurts, materialize daily rollups
and/or switch pagination from LIMIT/OFFSET to keyset on `(ts, id)`.

## API surface (all behind the admin-session middleware)

- `GET /api/admin/stats?section=…&days=N`
  - `visitors` — `page, pageSize (≤100), country, device, q` (prefix on
    anon_id/ip_hash) → `{kpis{uniqueVisitors,returningVisitors,totalVisits,
    avgVisitsPerVisitor}, rows[], total, page, pageSize}`
  - `visitor&id=<anon_id|ip_hash>` → `{profile, events[≤50], documents[≤25]}`
  - `geo` → `{countries[≤50], cities[≤100], points[≤500]}` — points are
    0.1°-binned lat/lon (privacy-friendly; no per-visitor precision)
  - `docinsights` → cards + daily series + size/page histograms +
    largest/top-filenames/top-producers
- `GET /api/admin/documents?q&from&to&minPages&maxPages&minBytes&maxBytes&status&source&dupesOnly&sort&dir&page&pageSize`
  — filterable, paginated listing; `duplicates` per row via window count on
  sha256. SQL assembly is the pure, unit-tested `buildDocumentsQuery` in
  `src/lib/admin/queryHelpers.ts` (parameterized, whitelist-sorted).
- `DELETE /api/admin/documents` body `{ids?: number[], sha256?: string}` —
  deletes metadata rows (per-row or all duplicates of a hash).
- `GET /api/admin/export?report=daily|terms|funnel|retention|visitors|geo|documents&days=N&format=csv|json`

### Why no .xlsx

CSV opens natively in Excel; a spreadsheet library (sheetjs et al.) adds
~1MB+ to the serverless bundle for no analytical gain. Decision: CSV + JSON.
If true .xlsx is ever required, add `exceljs` on a dedicated route.

## Admin UI

New pages under `src/app/admin/`: `visitors/` (KPIs, filterable paginated
table, per-visitor detail), `geo/` (world map + country/city tables),
`documents/` (insight cards, charts, filterable table with delete and
duplicate badges). Overview gained document/geo summary cards.

The world map (`src/components/admin/WorldMap.tsx`) is dependency-free:
a simplified Natural Earth-derived land outline (`worldOutline.ts`, public
domain, ~65KB, regenerable via the script noted in its header) rendered as
an equirectangular SVG with sqrt-scaled visitor bubbles. It is loaded with
`next/dynamic({ssr:false})` from the admin route only, so it never enters
public-page bundles (verified via `next build` route sizes).

## Env vars

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres (existing; everything degrades gracefully without it) |
| `IP_HASH_SECRET` | HMAC key for `ip_hash`. Falls back to `ADMIN_SESSION_SECRET`, then `ADMIN_PASSWORD`; if none, `ip_hash` stays NULL |

## Known caveats

- The 500MB session size cap applies to local files only; URL-sourced PDFs
  have unknown size until fetched (each is still capped at 50MB by the proxy).
- `pdf_created`/`pdf_modified` are stored as raw PDF date strings
  (`D:YYYYMMDD…`) — PDF date formats are too inconsistent to normalize at
  ingestion.
- Rotating `IP_HASH_SECRET` resets returning-visitor continuity for the
  ip_hash dimension (anon_id continuity is unaffected).
- In-memory rate limiting on `/api/track` is best-effort per lambda instance;
  the 32KB body cap and 25-event batch cap are the hard limits.
