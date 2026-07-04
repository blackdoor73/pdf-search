# Analytics Audit & Identity Model

Audit of the v1 telemetry pipeline (July 2026), root cause of inflated user
counts, and the corrected identity architecture. Companion to
[ADMIN_DASHBOARD.md](ADMIN_DASHBOARD.md).

## Root cause: why one browser showed ~3 users

Reported symptom: one device/browser produced Active Now 3, DAU/WAU/MAU 3,
Users Lifetime 3.

| # | Defect | Severity | Mechanism |
|---|--------|----------|-----------|
| 1 | No bot filtering | **CRITICAL** | Googlebot (and link-preview/monitoring bots) execute JS. Every crawler render starts with an empty cookie jar → new `anon_id` → counted as a new user. The site was freshly submitted to Search Console and being actively crawled. |
| 2 | Active Now counted tabs | **CRITICAL** | `session_id` was a per-tab `sessionStorage` UUID; `active_now` did `count(DISTINCT session_id)`. One person with 3 tabs = "3 active users". Sessions also never expired on inactivity. |
| 3 | Multi-tab first-visit race | HIGH | `getOrCreateSessionId()` (read cookie → generate → write) had no coordination. Several tabs opening simultaneously on a first visit could each mint an `anon_id`; the losers' early events carry distinct ids forever. |
| 4 | Admin traffic counted | HIGH | Checking the dashboard inflated the dashboard. |
| 5 | No event idempotency | MEDIUM | A retried `sendBeacon`/`fetch` could double-insert events. |
| 6 | "Clear history" resets identity | LOW (by design) | The in-product privacy reset deletes the anon cookie → new visitor. Kept deliberately; now documented. |

"PDFs Today: 4" was correct behavior — uploads are counted per file.

## Fixes shipped

| Defect | Fix |
|--------|-----|
| Bots | `src/lib/analytics/bots.ts` UA denylist enforced in `/api/track` (Googlebot, headless, previews, monitors, AI crawlers, empty UA) + `navigator.webdriver` check client-side. |
| Sessions | `src/lib/analytics/identityCore.ts`: session id lives in `localStorage`, **shared across tabs**, expires after 30 min inactivity, activity touches throttled to 15 s. `session_start` fires exactly when a new session begins (with landing page, referrer, UTM params, tz, lang). |
| Anon id race / loss | Cookie (`pdfsearch_session`, legacy name kept so existing visitors persist) + localStorage mirror; each heals the other. Race window reduced to sub-ms convergent writes. |
| Admin traffic | `/api/track` verifies the httpOnly admin session cookie and drops the batch (`TRACK_ADMIN_TRAFFIC=true` to disable). |
| Idempotency | Client UUID per event → `events.event_id` + partial unique index + `ON CONFLICT DO NOTHING`. Migration is automatic (`ALTER TABLE ... IF NOT EXISTS`). |
| Active Now | Now `count(DISTINCT anon_id)` (people, not tabs) in overview + realtime. |

Also added: new vs returning users (first-seen based), avg session duration,
engaged-session rate, DAU/MAU stickiness, pages scanned, first-party
acquisition sources (referrer + UTM, bot-filtered), and a **Recent visitors**
ground-truth table on the System page (one row per raw `anon_id` — verify
every dashboard number against actual database identities).

## Identity model (documented semantics)

- **Visitor (`anon_id`)** — one per browser profile. Survives refreshes,
  sessions, and days (90-day cookie + localStorage mirror). A different
  browser, device, or incognito window is a *different visitor* — no
  fingerprinting is used to bridge them. Clearing site data, or using the
  in-product "clear history", intentionally creates a new visitor.
- **Session (`session_id`)** — one per activity period, shared across tabs,
  ends after 30 min of inactivity. Reopening after expiry = same visitor,
  new session.
- **Page view / event** — one row per occurrence; `event_id` deduplicates
  retries.
- **DAU/WAU/MAU** — distinct `anon_id` with ≥1 event in the window.
  **Active Now** — distinct `anon_id` in the last 5 min. **New user** —
  first-ever event falls inside the window. **Users Lifetime** — distinct
  `anon_id` ever (lifetime metric; ignores the date filter).
- **`user_id`** — reserved; the product has no accounts. When it does: emit
  an `identify` event carrying both ids, attribute anon history at query
  time, never rewrite rows.

Canonical scenario: one visitor opens the site, refreshes 10×, views 20
pages, uploads 4 PDFs, leaves, returns 2 hours later → Visitors 1,
Lifetime 1, Sessions 2, Page Views 20+, PDFs 4. This is encoded in
`tests/identity.test.ts` (run `npm test`).

## Data hygiene note

Rows ingested before this fix (bot renders, per-tab sessions, admin visits)
remain in the table and still skew lifetime numbers. For a clean slate run
once in the Neon SQL editor:

```sql
TRUNCATE events;
```

or keep history and mentally discount pre-fix data.

## Privacy & retention

- Stored per event: anon UUID, session UUID, event name, path, referrer,
  country (from Vercel's geo header — the IP itself is never stored),
  coarse device/browser, and event props (counts, sizes, durations,
  truncated search text). No PDF content, no filenames, no PII. DNT/GPC
  honored client-side.
- **Search terms**: stored by default per the original product decision
  (powers "Most searched terms"). Set `TRACK_SEARCH_TERMS=false` to strip
  them at ingestion; query length (`qLen`) and match counts are always
  kept, so success-rate metrics survive.
- Retention: keep raw events ~180 days, then prune:
  `DELETE FROM events WHERE ts < now() - interval '180 days';`
  The System page tracks table size against Neon's 512 MB free tier.

## Scalability path

- **Now (≤ ~1M events)**: on-read SQL aggregates, indexed by `(ts)`,
  `(event, ts)`, `(anon_id, ts)`. Ingestion is client-batched (sendBeacon,
  4 s window, 25-event cap), one bulk `INSERT ... unnest` per batch —
  analytics never blocks uploads/search, which are client-side anyway.
- **Medium (~1–20M)**: add a nightly rollup table (`daily_stats`) via
  Vercel Cron; dashboards read rollups, realtime stays on raw recent rows.
- **Large (20M+)**: partition `events` by month, prune partitions, or move
  the event stream to a columnar store (Tinybird/ClickHouse). Don't build
  this before the data demands it.

## Verification

Local: `npm test` (identity + bot semantics), `npm run type-check`,
`npm run build`. SQL (migration, idempotent insert, every dashboard query)
validated against real Postgres 15.

Production, after deploy:
1. Browse the site normally, refresh several times, open extra tabs, upload
   PDFs, search.
2. Admin → **System → Recent visitors**: you should be **one** row, events
   accumulating, sessions = 1 (until 30 min of inactivity passes).
3. Overview → Active Now should read 1 while only you browse — regardless
   of tab count. (Note: with default self-exclusion, do this check from a
   browser where you are *not* logged into /admin, or set
   `TRACK_ADMIN_TRAFFIC=true` temporarily.)
4. Return after 30+ min idle → same visitor row, sessions = 2.
5. Raw ground truth in Neon:
   `SELECT anon_id, min(ts), count(*), count(DISTINCT session_id) FROM events GROUP BY 1;`

## Known limitations

- Safari ITP caps JS-set cookie lifetime (~7 days); the localStorage mirror
  extends identity, but a Safari user idle >7 days who also loses storage
  becomes a new visitor. Accepted — the alternative is fingerprinting.
- Two brand-new tabs opened in the same millisecond can still race the
  first-ever id write; both converge on the next event. Practically
  unobservable.
- In-memory rate limiting is per-lambda; the hard limits are the payload
  and batch caps.
- Pre-fix rows are not retroactively cleaned (see Data hygiene above).
