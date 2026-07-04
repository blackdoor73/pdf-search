/**
 * Admin analytics SQL — all first-party metrics computed from the events
 * table. Every function assumes ensureSchema() has run (callers in the API
 * routes handle that) and that isDbConfigured() is true.
 *
 * Volume note: the site is early-stage, so we compute aggregates on read.
 * If event volume ever makes these slow, materialize daily rollups.
 */

import { getSql } from "@/lib/db";

type Row = Record<string, unknown>;
const num = (v: unknown): number => (v == null ? 0 : Number(v));

export function clampDays(raw: string | null, fallback = 30): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(180, Math.max(1, Math.floor(n)));
}

// ─── Overview ──────────────────────────────────────────────────────────────────

export async function getOverview(days: number) {
  const sql = getSql();

  const [kpis] = (await sql`
    SELECT
      count(DISTINCT anon_id) FILTER (WHERE ts >= date_trunc('day', now()))          AS dau,
      count(DISTINCT anon_id) FILTER (WHERE ts > now() - interval '7 days')          AS wau,
      count(DISTINCT anon_id) FILTER (WHERE ts > now() - interval '30 days')         AS mau,
      count(DISTINCT anon_id) FILTER (WHERE ts > now() - interval '5 minutes')       AS active_now,
      count(DISTINCT anon_id)                                                        AS lifetime_users,
      count(*) FILTER (WHERE event = 'page_view' AND ts > now() - interval '30 days') AS pageviews_30d,
      count(DISTINCT session_id) FILTER (WHERE ts > now() - interval '30 days')      AS sessions_30d,
      coalesce(sum((props->>'count')::int) FILTER (WHERE event = 'pdf_upload' AND ts >= date_trunc('day', now())), 0)    AS uploads_today,
      coalesce(sum((props->>'count')::int) FILTER (WHERE event = 'pdf_upload' AND ts > now() - interval '7 days'), 0)    AS uploads_7d,
      coalesce(sum((props->>'count')::int) FILTER (WHERE event = 'pdf_upload' AND ts > now() - interval '30 days'), 0)   AS uploads_30d,
      coalesce(sum((props->>'count')::int) FILTER (WHERE event = 'pdf_upload'), 0)                                       AS uploads_lifetime,
      count(*) FILTER (WHERE event = 'search' AND ts >= date_trunc('day', now()))    AS searches_today,
      count(*) FILTER (WHERE event = 'search' AND ts > now() - interval '30 days')   AS searches_30d,
      count(*) FILTER (WHERE event = 'search')                                       AS searches_lifetime
    FROM events
  `) as Row[];

  // New vs returning: a "new" user's first-ever event falls inside the window.
  const [firsts] = (await sql`
    SELECT count(*) AS new_users_30d
    FROM (SELECT anon_id, min(ts) AS first_seen FROM events GROUP BY anon_id) f
    WHERE f.first_seen > now() - interval '30 days'
  `) as Row[];

  // Session quality (30d): duration = event span within a session;
  // engaged = more than one pageview or any product action.
  const [sessionStats] = (await sql`
    SELECT
      avg(dur_sec)  AS avg_session_sec,
      count(*) FILTER (WHERE engaged)::float / nullif(count(*), 0) AS engaged_rate
    FROM (
      SELECT
        extract(epoch FROM max(ts) - min(ts)) AS dur_sec,
        (count(*) FILTER (WHERE event = 'page_view') > 1
         OR count(*) FILTER (WHERE event IN ('pdf_upload','pdf_url_added','search','export_csv')) > 0) AS engaged
      FROM events
      WHERE ts > now() - interval '30 days'
      GROUP BY session_id
    ) s
  `) as Row[];

  const series = (await sql`
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS date,
      count(DISTINCT e.anon_id)    AS visitors,
      count(DISTINCT e.session_id) AS sessions,
      coalesce(sum((e.props->>'count')::int) FILTER (WHERE e.event = 'pdf_upload'), 0) AS uploads,
      count(e.*) FILTER (WHERE e.event = 'search') AS searches,
      count(e.*) FILTER (WHERE e.event = 'page_view') AS pageviews
    FROM generate_series(
      date_trunc('day', now()) - make_interval(days => ${days} - 1),
      date_trunc('day', now()),
      interval '1 day'
    ) AS d(day)
    LEFT JOIN events e ON e.ts >= d.day AND e.ts < d.day + interval '1 day'
    GROUP BY d.day
    ORDER BY d.day
  `) as Row[];

  const mau = num(kpis?.mau);
  const newUsers30d = num(firsts?.new_users_30d);

  return {
    kpis: {
      ...Object.fromEntries(Object.entries(kpis ?? {}).map(([k, v]) => [k, num(v)])),
      new_users_30d: newUsers30d,
      returning_users_30d: Math.max(0, mau - newUsers30d),
      avg_session_sec: num(sessionStats?.avg_session_sec),
      engaged_rate: num(sessionStats?.engaged_rate),
    },
    series: series.map((r) => ({
      date: String(r.date),
      visitors: num(r.visitors),
      sessions: num(r.sessions),
      uploads: num(r.uploads),
      searches: num(r.searches),
      pageviews: num(r.pageviews),
    })),
  };
}

// ─── Product metrics ───────────────────────────────────────────────────────────

export async function getProduct(days: number) {
  const sql = getSql();

  const [agg] = (await sql`
    SELECT
      avg((props->>'totalBytes')::bigint / nullif((props->>'count')::int, 0))
        FILTER (WHERE event = 'pdf_upload')                                          AS avg_file_bytes,
      avg((props->>'durationMs')::float) FILTER (WHERE event = 'search')             AS avg_search_ms,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY (props->>'durationMs')::float)
        FILTER (WHERE event = 'search')                                              AS p95_search_ms,
      count(*) FILTER (WHERE event = 'search')                                       AS searches,
      count(*) FILTER (WHERE event = 'search' AND (props->>'matches')::int > 0)      AS searches_with_results,
      coalesce(sum((props->>'count')::int) FILTER (WHERE event = 'pdf_upload'), 0)   AS pdfs_uploaded,
      count(DISTINCT anon_id) FILTER (WHERE event = 'pdf_upload')                    AS uploading_users,
      count(DISTINCT session_id)                                                     AS sessions,
      avg((props->>'files')::int) FILTER (WHERE event = 'search')                    AS avg_files_per_search,
      coalesce(sum((props->>'pages')::int) FILTER (WHERE event = 'search'), 0)       AS pages_scanned
    FROM events
    WHERE ts > now() - make_interval(days => ${days})
  `) as Row[];

  const uploadsPerHour = (await sql`
    SELECT to_char(h.hour, 'YYYY-MM-DD HH24:00') AS hour,
      coalesce(sum((e.props->>'count')::int) FILTER (WHERE e.event = 'pdf_upload'), 0) AS uploads,
      count(e.*) FILTER (WHERE e.event = 'search') AS searches
    FROM generate_series(
      date_trunc('hour', now()) - interval '47 hours',
      date_trunc('hour', now()),
      interval '1 hour'
    ) AS h(hour)
    LEFT JOIN events e ON e.ts >= h.hour AND e.ts < h.hour + interval '1 hour'
    GROUP BY h.hour ORDER BY h.hour
  `) as Row[];

  const topTerms = (await sql`
    SELECT props->>'q' AS term,
      count(*) AS searches,
      count(*) FILTER (WHERE (props->>'matches')::int > 0) AS with_results,
      round(avg((props->>'matches')::int)) AS avg_matches
    FROM events
    WHERE event = 'search'
      AND ts > now() - make_interval(days => ${days})
      AND coalesce(props->>'q', '') <> ''
    GROUP BY 1 ORDER BY 2 DESC LIMIT 25
  `) as Row[];

  const zeroResultTerms = (await sql`
    SELECT props->>'q' AS term, count(*) AS searches
    FROM events
    WHERE event = 'search'
      AND ts > now() - make_interval(days => ${days})
      AND coalesce((props->>'matches')::int, 0) = 0
      AND coalesce(props->>'q', '') <> ''
    GROUP BY 1 ORDER BY 2 DESC LIMIT 15
  `) as Row[];

  const successSeries = (await sql`
    SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS date,
      count(*) AS searches,
      count(*) FILTER (WHERE (props->>'matches')::int > 0) AS with_results
    FROM events
    WHERE event = 'search' AND ts > now() - make_interval(days => ${days})
    GROUP BY 1 ORDER BY 1
  `) as Row[];

  const searches = num(agg?.searches);
  return {
    avgFileBytes: num(agg?.avg_file_bytes),
    avgSearchMs: num(agg?.avg_search_ms),
    p95SearchMs: num(agg?.p95_search_ms),
    searches,
    searchSuccessRate: searches ? num(agg?.searches_with_results) / searches : null,
    pdfsUploaded: num(agg?.pdfs_uploaded),
    avgUploadsPerUser: num(agg?.uploading_users)
      ? num(agg?.pdfs_uploaded) / num(agg?.uploading_users)
      : null,
    avgFilesPerSearch: num(agg?.avg_files_per_search),
    pagesScanned: num(agg?.pages_scanned),
    searchesPerSession: num(agg?.sessions) ? searches / num(agg?.sessions) : null,
    uploadsPerHour: uploadsPerHour.map((r) => ({
      hour: String(r.hour),
      uploads: num(r.uploads),
      searches: num(r.searches),
    })),
    topTerms: topTerms.map((r) => ({
      term: String(r.term),
      searches: num(r.searches),
      withResults: num(r.with_results),
      avgMatches: num(r.avg_matches),
    })),
    zeroResultTerms: zeroResultTerms.map((r) => ({
      term: String(r.term),
      searches: num(r.searches),
    })),
    successSeries: successSeries.map((r) => ({
      date: String(r.date),
      searches: num(r.searches),
      withResults: num(r.with_results),
    })),
  };
}

// ─── Retention cohorts (weekly, last 8 weeks) ─────────────────────────────────

export async function getRetention() {
  const sql = getSql();

  const rows = (await sql`
    WITH firsts AS (
      SELECT anon_id, date_trunc('week', min(ts)) AS cohort
      FROM events GROUP BY anon_id
    ),
    activity AS (
      SELECT DISTINCT anon_id, date_trunc('week', ts) AS week FROM events
    )
    SELECT
      to_char(f.cohort, 'YYYY-MM-DD') AS cohort,
      floor(extract(epoch FROM (a.week - f.cohort)) / 604800)::int AS week_offset,
      count(DISTINCT a.anon_id) AS active
    FROM firsts f
    JOIN activity a USING (anon_id)
    WHERE f.cohort > now() - interval '8 weeks'
    GROUP BY f.cohort, week_offset
    ORDER BY f.cohort, week_offset
  `) as Row[];

  const cohorts = new Map<
    string,
    { cohort: string; size: number; weeks: number[] }
  >();
  for (const r of rows) {
    const key = String(r.cohort);
    if (!cohorts.has(key)) cohorts.set(key, { cohort: key, size: 0, weeks: [] });
    const c = cohorts.get(key)!;
    const offset = num(r.week_offset);
    c.weeks[offset] = num(r.active);
    if (offset === 0) c.size = num(r.active);
  }
  return Array.from(cohorts.values());
}

// ─── System health ─────────────────────────────────────────────────────────────

export async function getSystem() {
  const sql = getSql();

  const [rates] = (await sql`
    SELECT
      count(*) FILTER (WHERE event = 'search' AND ts > now() - interval '24 hours')        AS searches_24h,
      count(*) FILTER (WHERE event = 'search_error' AND ts > now() - interval '24 hours')  AS search_errors_24h,
      count(*) FILTER (WHERE event = 'pdf_load_error' AND ts > now() - interval '24 hours') AS load_errors_24h,
      coalesce(sum((props->>'count')::int)
        FILTER (WHERE event = 'pdf_upload' AND ts > now() - interval '24 hours'), 0)       AS uploads_24h,
      count(*) FILTER (WHERE event = 'client_error' AND ts > now() - interval '24 hours')  AS client_errors_24h,
      count(*) FILTER (WHERE ts > now() - interval '24 hours')                              AS events_24h,
      max(ts)                                                                               AS last_event_at
    FROM events
  `) as Row[];

  const [latency] = (await sql`
    SELECT
      percentile_cont(0.5)  WITHIN GROUP (ORDER BY (props->>'durationMs')::float) AS p50,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY (props->>'durationMs')::float) AS p95,
      percentile_cont(0.99) WITHIN GROUP (ORDER BY (props->>'durationMs')::float) AS p99
    FROM events
    WHERE event = 'search' AND ts > now() - interval '7 days'
  `) as Row[];

  const webVitals = (await sql`
    SELECT props->>'name' AS name,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY (props->>'value')::float) AS p75,
      count(*) AS samples
    FROM events
    WHERE event = 'web_vital' AND ts > now() - interval '7 days'
    GROUP BY 1
  `) as Row[];

  const errorCodes = (await sql`
    SELECT coalesce(props->>'code', 'unknown') AS code, count(*) AS count
    FROM events
    WHERE event = 'pdf_load_error' AND ts > now() - interval '7 days'
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  `) as Row[];

  const [storage] = (await sql`
    SELECT
      pg_database_size(current_database()) AS db_bytes,
      pg_total_relation_size('events')     AS events_bytes,
      (SELECT count(*) FROM events)        AS event_count
  `) as Row[];

  const recentErrors = (await sql`
    SELECT to_char(ts, 'YYYY-MM-DD HH24:MI') AS at, event,
      coalesce(props->>'message', props->>'code', '') AS detail, page
    FROM events
    WHERE event IN ('client_error', 'search_error', 'pdf_load_error')
    ORDER BY ts DESC LIMIT 15
  `) as Row[];

  return {
    searches24h: num(rates?.searches_24h),
    searchErrors24h: num(rates?.search_errors_24h),
    loadErrors24h: num(rates?.load_errors_24h),
    uploads24h: num(rates?.uploads_24h),
    clientErrors24h: num(rates?.client_errors_24h),
    events24h: num(rates?.events_24h),
    lastEventAt: rates?.last_event_at ? String(rates.last_event_at) : null,
    searchLatency: { p50: num(latency?.p50), p95: num(latency?.p95), p99: num(latency?.p99) },
    webVitals: webVitals.map((r) => ({
      name: String(r.name),
      p75: num(r.p75),
      samples: num(r.samples),
    })),
    errorCodes: errorCodes.map((r) => ({ code: String(r.code), count: num(r.count) })),
    storage: {
      dbBytes: num(storage?.db_bytes),
      eventsBytes: num(storage?.events_bytes),
      eventCount: num(storage?.event_count),
    },
    recentErrors: recentErrors.map((r) => ({
      at: String(r.at),
      event: String(r.event),
      detail: String(r.detail ?? ""),
      page: String(r.page ?? ""),
    })),
  };
}

// ─── Realtime (Command Center) ─────────────────────────────────────────────────

export async function getRealtime() {
  const sql = getSql();

  const [now] = (await sql`
    SELECT
      count(DISTINCT anon_id) FILTER (WHERE ts > now() - interval '5 minutes')     AS active_now,
      count(*) FILTER (WHERE ts > now() - interval '60 minutes')                    AS events_1h,
      coalesce(sum((props->>'count')::int)
        FILTER (WHERE event = 'pdf_upload' AND ts > now() - interval '60 minutes'), 0) AS uploads_1h,
      count(*) FILTER (WHERE event = 'search' AND ts > now() - interval '60 minutes')  AS searches_1h,
      count(*) FILTER (WHERE event IN ('client_error','search_error','pdf_load_error')
        AND ts > now() - interval '60 minutes')                                        AS errors_1h
    FROM events
  `) as Row[];

  const perMinute = (await sql`
    SELECT to_char(m.minute, 'HH24:MI') AS minute,
      count(e.*) FILTER (WHERE e.event = 'page_view') AS pageviews,
      coalesce(sum((e.props->>'count')::int) FILTER (WHERE e.event = 'pdf_upload'), 0) AS uploads,
      count(e.*) FILTER (WHERE e.event = 'search') AS searches
    FROM generate_series(
      date_trunc('minute', now()) - interval '59 minutes',
      date_trunc('minute', now()),
      interval '1 minute'
    ) AS m(minute)
    LEFT JOIN events e ON e.ts >= m.minute AND e.ts < m.minute + interval '1 minute'
    GROUP BY m.minute ORDER BY m.minute
  `) as Row[];

  const feed = (await sql`
    SELECT to_char(ts, 'HH24:MI:SS') AS at, event, country, device, page,
      CASE
        WHEN event = 'search' THEN left(coalesce(props->>'q',''), 40)
        WHEN event = 'pdf_upload' THEN (props->>'count') || ' file(s)'
        WHEN event IN ('client_error','pdf_load_error') THEN left(coalesce(props->>'message', props->>'code', ''), 60)
        ELSE ''
      END AS detail
    FROM events
    ORDER BY ts DESC LIMIT 25
  `) as Row[];

  return {
    activeNow: num(now?.active_now),
    events1h: num(now?.events_1h),
    uploads1h: num(now?.uploads_1h),
    searches1h: num(now?.searches_1h),
    errors1h: num(now?.errors_1h),
    perMinute: perMinute.map((r) => ({
      minute: String(r.minute),
      pageviews: num(r.pageviews),
      uploads: num(r.uploads),
      searches: num(r.searches),
    })),
    feed: feed.map((r) => ({
      at: String(r.at),
      event: String(r.event),
      country: r.country ? String(r.country) : "",
      device: r.device ? String(r.device) : "",
      page: r.page ? String(r.page) : "",
      detail: String(r.detail ?? ""),
    })),
  };
}

// ─── First-party acquisition (session_start referrer/UTM) ────────────────────

export async function getFirstPartySources(days: number) {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      CASE
        WHEN coalesce(props->>'utm_source', '') <> ''
          THEN 'utm: ' || (props->>'utm_source')
          || CASE WHEN coalesce(props->>'utm_medium','') <> '' THEN ' / ' || (props->>'utm_medium') ELSE '' END
        WHEN coalesce(referrer, '') = '' THEN 'direct'
        ELSE regexp_replace(referrer, '^https?://([^/]+).*$', '\1')
      END AS source,
      count(*) AS sessions,
      count(DISTINCT anon_id) AS visitors
    FROM events
    WHERE event = 'session_start' AND ts > now() - make_interval(days => ${days})
    GROUP BY 1 ORDER BY 2 DESC LIMIT 15
  `) as Row[];
  return rows.map((r) => ({
    source: String(r.source),
    sessions: num(r.sessions),
    visitors: num(r.visitors),
  }));
}

// ─── Raw visitors (System page — verify identity counting against the DB) ────

export async function getVisitorsDebug() {
  const sql = getSql();
  const rows = (await sql`
    SELECT
      left(anon_id, 8) AS visitor,
      to_char(min(ts), 'MM-DD HH24:MI') AS first_seen,
      to_char(max(ts), 'MM-DD HH24:MI') AS last_seen,
      count(*) AS events,
      count(DISTINCT session_id) AS sessions,
      max(device) AS device,
      max(browser) AS browser,
      coalesce(max(country), '') AS country
    FROM events
    GROUP BY anon_id
    ORDER BY max(ts) DESC
    LIMIT 25
  `) as Row[];
  return rows.map((r) => ({
    visitor: String(r.visitor),
    firstSeen: String(r.first_seen),
    lastSeen: String(r.last_seen),
    events: num(r.events),
    sessions: num(r.sessions),
    device: String(r.device ?? ""),
    browser: String(r.browser ?? ""),
    country: String(r.country ?? ""),
  }));
}

// ─── Funnel (Growth Insights) ─────────────────────────────────────────────────

export async function getFunnel(days: number) {
  const sql = getSql();
  const [f] = (await sql`
    SELECT
      count(DISTINCT session_id) AS sessions,
      count(DISTINCT session_id) FILTER (WHERE event IN ('pdf_upload','pdf_url_added')) AS with_upload,
      count(DISTINCT session_id) FILTER (WHERE event = 'search')                        AS with_search,
      count(DISTINCT session_id) FILTER (WHERE event = 'search'
        AND (props->>'matches')::int > 0)                                               AS with_success,
      count(DISTINCT session_id) FILTER (WHERE event = 'export_csv')                    AS with_export
    FROM events
    WHERE ts > now() - make_interval(days => ${days})
  `) as Row[];

  return {
    sessions: num(f?.sessions),
    withUpload: num(f?.with_upload),
    withSearch: num(f?.with_search),
    withSuccess: num(f?.with_success),
    withExport: num(f?.with_export),
  };
}

// ─── Anomaly alerts ────────────────────────────────────────────────────────────

export interface Alert {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
}

export async function getAlerts(): Promise<Alert[]> {
  const sql = getSql();
  const alerts: Alert[] = [];

  const [r] = (await sql`
    SELECT
      count(*) FILTER (WHERE ts > now() - interval '1 hour') AS events_last_hour,
      count(*) FILTER (WHERE ts > now() - interval '169 hours' AND ts <= now() - interval '1 hour') / 168.0 AS hourly_baseline,
      count(*) FILTER (WHERE event = 'pdf_load_error' AND ts > now() - interval '1 hour') AS load_errors_1h,
      coalesce(sum((props->>'count')::int)
        FILTER (WHERE event = 'pdf_upload' AND ts > now() - interval '1 hour'), 0) AS uploads_1h,
      count(*) FILTER (WHERE event = 'search' AND ts > now() - interval '24 hours') AS searches_24h,
      count(*) FILTER (WHERE event = 'search' AND coalesce((props->>'matches')::int,0) = 0
        AND ts > now() - interval '24 hours') AS zero_searches_24h,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY (props->>'durationMs')::float)
        FILTER (WHERE event = 'search' AND ts > now() - interval '24 hours') AS p95_24h,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY (props->>'durationMs')::float)
        FILTER (WHERE event = 'search' AND ts > now() - interval '8 days'
                AND ts <= now() - interval '24 hours') AS p95_baseline,
      count(*) FILTER (WHERE ts > now() - interval '24 hours') AS events_24h,
      max(ts) AS last_event_at,
      pg_database_size(current_database()) AS db_bytes
    FROM events
  `) as Row[];

  const eventsLastHour = num(r?.events_last_hour);
  const baseline = num(r?.hourly_baseline);
  if (baseline > 2 && eventsLastHour > baseline * 3 && eventsLastHour > 50) {
    alerts.push({
      severity: "info",
      title: "Traffic spike",
      detail: `${eventsLastHour} events in the last hour vs ~${Math.round(baseline)}/hr baseline (7-day avg).`,
    });
  }

  const loadErrors = num(r?.load_errors_1h);
  const uploads1h = num(r?.uploads_1h);
  if (loadErrors >= 5 && loadErrors > uploads1h * 0.15) {
    alerts.push({
      severity: "critical",
      title: "Upload failures elevated",
      detail: `${loadErrors} PDF load errors in the last hour against ${uploads1h} successful uploads.`,
    });
  }

  const searches24h = num(r?.searches_24h);
  const zero24h = num(r?.zero_searches_24h);
  if (searches24h >= 20 && zero24h / searches24h > 0.6) {
    alerts.push({
      severity: "warning",
      title: "High zero-result search rate",
      detail: `${Math.round((zero24h / searches24h) * 100)}% of ${searches24h} searches in 24h returned no matches.`,
    });
  }

  const p95 = num(r?.p95_24h);
  const p95Base = num(r?.p95_baseline);
  if (p95Base > 200 && p95 > p95Base * 2) {
    alerts.push({
      severity: "warning",
      title: "Slow search processing",
      detail: `p95 search time ${Math.round(p95)}ms in 24h vs ${Math.round(p95Base)}ms 7-day baseline.`,
    });
  }

  const lastEventAt = r?.last_event_at ? new Date(String(r.last_event_at)).getTime() : 0;
  if (num(r?.events_24h) > 20 && lastEventAt && Date.now() - lastEventAt > 30 * 60_000) {
    alerts.push({
      severity: "warning",
      title: "Telemetry ingestion stalled",
      detail: `No events received for ${Math.round((Date.now() - lastEventAt) / 60_000)} minutes despite recent traffic.`,
    });
  }

  const dbBytes = num(r?.db_bytes);
  if (dbBytes > 400 * 1024 * 1024) {
    alerts.push({
      severity: "warning",
      title: "Database approaching free-tier limit",
      detail: `Database size ${(dbBytes / 1048576).toFixed(0)} MB — Neon free tier caps at 512 MB. Consider pruning old events.`,
    });
  }

  return alerts;
}

// ─── CSV export ────────────────────────────────────────────────────────────────

function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const esc = (v: string | number | null) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export async function exportCsv(report: string, days: number): Promise<{ filename: string; csv: string }> {
  const stamp = new Date().toISOString().slice(0, 10);

  if (report === "daily") {
    const { series } = await getOverview(days);
    return {
      filename: `pdfsearch-daily-${stamp}.csv`,
      csv: toCsv(
        ["date", "visitors", "sessions", "pageviews", "uploads", "searches"],
        series.map((r) => [r.date, r.visitors, r.sessions, r.pageviews, r.uploads, r.searches])
      ),
    };
  }

  if (report === "terms") {
    const { topTerms } = await getProduct(days);
    return {
      filename: `pdfsearch-top-terms-${stamp}.csv`,
      csv: toCsv(
        ["term", "searches", "with_results", "avg_matches"],
        topTerms.map((t) => [t.term, t.searches, t.withResults, t.avgMatches])
      ),
    };
  }

  if (report === "funnel") {
    const f = await getFunnel(days);
    return {
      filename: `pdfsearch-funnel-${stamp}.csv`,
      csv: toCsv(
        ["stage", "sessions"],
        [
          ["Visited", f.sessions],
          ["Loaded PDFs", f.withUpload],
          ["Searched", f.withSearch],
          ["Found results", f.withSuccess],
          ["Exported CSV", f.withExport],
        ]
      ),
    };
  }

  if (report === "retention") {
    const cohorts = await getRetention();
    const maxWeeks = Math.max(0, ...cohorts.map((c) => c.weeks.length));
    return {
      filename: `pdfsearch-retention-${stamp}.csv`,
      csv: toCsv(
        ["cohort_week", "size", ...Array.from({ length: maxWeeks }, (_, i) => `week_${i}`)],
        cohorts.map((c) => [
          c.cohort,
          c.size,
          ...Array.from({ length: maxWeeks }, (_, i) => c.weeks[i] ?? ""),
        ])
      ),
    };
  }

  throw new Error(`Unknown report: ${report}`);
}
