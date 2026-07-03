# Admin Analytics Dashboard

Internal analytics for **pdfsearch.info** at **`/admin`** (password-protected,
noindexed). Tracks growth, product usage, system health, and user behavior.

## Architecture

```
Browser (client-side PDF engine)
  └─ src/lib/analytics/client.ts   anonymous event batching (sendBeacon)
       └─ POST /api/track          validate → enrich (geo/device) → Neon
                                       │
/admin (middleware-guarded UI) ────────┤
  ├─ /api/admin/stats              first-party metrics (SQL over events)
  ├─ /api/admin/traffic            GA4 Data API (service account)
  ├─ /api/admin/gsc                Search Console API
  └─ /api/admin/export             CSV reports
```

**Privacy:** PDFs never leave the browser — that hasn't changed. Telemetry is
anonymous events only: counts, byte sizes, durations, and search query text
(truncated to 120 chars). No PDF content, no filenames, no IPs stored (country
comes from Vercel's geo header, the IP itself is discarded). The tracker
respects Do Not Track / Global Privacy Control.

## Pages

| Page | Contents |
|---|---|
| `/admin` | KPIs (active now, DAU/WAU/MAU, uploads today/7d/30d/lifetime, searches), anomaly alerts, trend charts |
| `/admin/traffic` | GA4: realtime users, new vs returning, channels, landing pages, geo, devices/browsers + GSC keywords |
| `/admin/product` | Uploads/hour, avg file size, avg/p95 search time, top & zero-result search terms, success rate, retention cohorts |
| `/admin/system` | Upload/search/client error rates, client-measured latency percentiles, Core Web Vitals p75, failure causes, DB storage, health checks |
| `/admin/insights` | Auto-generated recommendations, dropoff funnel, high-bounce pages, GSC ranking opportunities |
| `/admin/command` | Live (5s poll): active users, per-minute load, live event feed, error rate |

**Anomaly alerts** (Overview banner, computed on read): traffic spike vs 7-day
hourly baseline, elevated upload failures, high zero-result rate, slow p95
search vs baseline, stalled ingestion, DB near free-tier limit.

**Note on "system metrics":** this app has no servers, queues, or workers —
PDF processing is 100% client-side. The System page therefore reports *real*
operational signals (user-measured latency, error rates, Web Vitals, ingestion
health) instead of fabricated CPU/queue numbers. Serverless function health
lives in the Vercel dashboard.

## Setup

### 1. Admin password (required)

Set `ADMIN_PASSWORD` (and optionally `ADMIN_SESSION_SECRET`) in Vercel →
Project → Settings → Environment Variables. Without it, `/admin` login returns
503.

### 2. Neon Postgres (`#neon`) — product metrics, funnel, cohorts, alerts

1. Create a free project at https://console.neon.tech (or Vercel Marketplace →
   Neon, which wires the env var automatically).
2. Copy the **pooled** connection string into `DATABASE_URL`.
3. Done — the schema (one `events` table + indexes) is created automatically
   on first ingestion.

Retention: the free tier holds ~512 MB (millions of events). The System page
tracks usage; prune with
`DELETE FROM events WHERE ts < now() - interval '180 days'` if needed.

### 3. Google Analytics 4 (`#ga4`) — traffic panels

1. Create a GA4 property, copy the Measurement ID → `NEXT_PUBLIC_GA_ID`
   (enables the gtag snippet sitewide).
2. Google Cloud Console → create a **service account**; enable the
   **Google Analytics Data API**.
3. Create a JSON key → set `GOOGLE_SERVICE_ACCOUNT_EMAIL` and
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (paste the key with `\n` escapes —
   the code normalizes them).
4. GA4 Admin → Property access management → add the service account email as
   **Viewer**.
5. Set `GA4_PROPERTY_ID` (numeric, from Property settings).

### 4. Search Console (`#gsc`) — keywords & ranking opportunities

1. Enable the **Search Console API** in the same Google Cloud project.
2. Search Console → Settings → Users → add the service account email
   (Restricted is enough).
3. Set `GSC_SITE_URL` (e.g. `sc-domain:pdfsearch.info`).

## Event taxonomy

| Event | Props | Fired from |
|---|---|---|
| `session_start` | landing, tz, lang | Analytics.tsx (once per tab) |
| `page_view` | path | Analytics.tsx (route changes) |
| `pdf_upload` | count, totalBytes | useSearchEngine.addFiles |
| `pdf_url_added` | count | useSearchEngine.addUrls |
| `pdf_load_error` | code | validation failures |
| `search` | q, matches, files, durationMs | useSearchEngine.search |
| `search_error` | message | search failures |
| `export_csv` | rows | results export |
| `client_error` | message, source | window error/rejection handlers |
| `web_vital` | name, value, rating | useReportWebVitals |

## CSV exports

`GET /api/admin/export?report=<daily|terms|funnel|retention>&days=N` — also
linked from the dashboard panels.
