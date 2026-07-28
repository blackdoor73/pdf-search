/**
 * Admin analytics SQL — all first-party metrics computed from the events
 * table. Every function assumes ensureSchema() has run (callers in the API
 * routes handle that) and that isDbConfigured() is true.
 *
 * Volume note: the site is early-stage, so we compute aggregates on read.
 * If event volume ever makes these slow, materialize daily rollups.
 */

import { getSql } from "@/lib/db";
import {
  buildDocumentsQuery,
  buildFeedbackQuery,
  toCsv,
  type DocumentFilters,
  type FeedbackFilters,
} from "./queryHelpers";

export {
  buildDocumentsQuery,
  buildFeedbackQuery,
  clampDays,
  clampPage,
  clampPageSize,
  toCsv,
  type DocumentFilters,
  type FeedbackFilters,
} from "./queryHelpers";

type Row = Record<string, unknown>;
const num = (v: unknown): number => (v == null ? 0 : Number(v));

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
      coalesce(props->>'message', props->>'code', '') AS detail, page,
      coalesce(props->>'source', '') AS source
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
      source: String(r.source ?? ""),
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

// ─── Visitors (paginated, filterable) ─────────────────────────────────────────

export interface VisitorFilters {
  days: number;
  page: number;
  pageSize: number;
  country?: string;
  device?: string;
  /** Prefix match on anon_id or ip_hash. */
  q?: string;
}

function visitorWhere(f: VisitorFilters): { where: string; params: unknown[] } {
  const clauses = ["ts > now() - make_interval(days => $1)"];
  const params: unknown[] = [f.days];
  if (f.country) {
    params.push(f.country);
    clauses.push(`country = $${params.length}`);
  }
  if (f.device) {
    params.push(f.device);
    clauses.push(`device = $${params.length}`);
  }
  if (f.q) {
    params.push(`${f.q}%`);
    clauses.push(
      `(anon_id LIKE $${params.length} OR ip_hash LIKE $${params.length})`
    );
  }
  return { where: clauses.join(" AND "), params };
}

export async function getVisitors(f: VisitorFilters) {
  const sql = getSql();
  const { where, params } = visitorWhere(f);

  const [kpis] = (await sql.query(
    `SELECT count(*)                             AS unique_visitors,
            count(*) FILTER (WHERE visits > 1)   AS returning_visitors,
            coalesce(sum(visits), 0)             AS total_visits
     FROM (
       SELECT anon_id, count(DISTINCT session_id) AS visits
       FROM events WHERE ${where} GROUP BY anon_id
     ) v`,
    params
  )) as Row[];

  const limit = f.pageSize;
  const offset = (f.page - 1) * f.pageSize;
  const rows = (await sql.query(
    `SELECT anon_id,
            max(ip_hash)  AS ip_hash,
            to_char(min(ts), 'YYYY-MM-DD HH24:MI') AS first_seen,
            to_char(max(ts), 'YYYY-MM-DD HH24:MI') AS last_seen,
            count(*)      AS events,
            count(DISTINCT session_id) AS visits,
            max(country)  AS country,
            max(region)   AS region,
            max(city)     AS city,
            max(device)   AS device,
            max(browser)  AS browser,
            max(os)       AS os,
            max(lang)     AS lang,
            max(tz)       AS tz,
            max(referrer) AS referrer
     FROM events WHERE ${where}
     GROUP BY anon_id
     ORDER BY max(ts) DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  )) as Row[];

  const uniqueVisitors = num(kpis?.unique_visitors);
  const totalVisits = num(kpis?.total_visits);
  return {
    kpis: {
      uniqueVisitors,
      returningVisitors: num(kpis?.returning_visitors),
      totalVisits,
      avgVisitsPerVisitor: uniqueVisitors ? totalVisits / uniqueVisitors : 0,
    },
    rows: rows.map((r) => ({
      anonId: String(r.anon_id),
      ipHash: r.ip_hash ? String(r.ip_hash) : "",
      firstSeen: String(r.first_seen),
      lastSeen: String(r.last_seen),
      events: num(r.events),
      visits: num(r.visits),
      country: String(r.country ?? ""),
      region: String(r.region ?? ""),
      city: String(r.city ?? ""),
      device: String(r.device ?? ""),
      browser: String(r.browser ?? ""),
      os: String(r.os ?? ""),
      lang: String(r.lang ?? ""),
      tz: String(r.tz ?? ""),
      referrer: String(r.referrer ?? ""),
    })),
    total: uniqueVisitors,
    page: f.page,
    pageSize: f.pageSize,
  };
}

export async function getVisitorDetail(id: string) {
  const sql = getSql();

  const [profile] = (await sql`
    SELECT anon_id, max(ip_hash) AS ip_hash,
      to_char(min(ts), 'YYYY-MM-DD HH24:MI') AS first_seen,
      to_char(max(ts), 'YYYY-MM-DD HH24:MI') AS last_seen,
      count(*) AS events, count(DISTINCT session_id) AS visits,
      max(country) AS country, max(region) AS region, max(city) AS city,
      max(device) AS device, max(browser) AS browser, max(os) AS os,
      max(lang) AS lang, max(tz) AS tz, max(referrer) AS referrer
    FROM events
    WHERE anon_id = ${id} OR ip_hash = ${id}
    GROUP BY anon_id
    LIMIT 1
  `) as Row[];

  if (!profile) return null;
  const anonId = String(profile.anon_id);

  const events = (await sql`
    SELECT to_char(ts, 'YYYY-MM-DD HH24:MI:SS') AS at, event, page,
      CASE
        WHEN event = 'search' THEN left(coalesce(props->>'q',''), 40)
        WHEN event = 'pdf_upload' THEN (props->>'count') || ' file(s)'
        WHEN event IN ('client_error','pdf_load_error') THEN left(coalesce(props->>'message', props->>'code', ''), 60)
        ELSE ''
      END AS detail
    FROM events
    WHERE anon_id = ${anonId}
    ORDER BY ts DESC LIMIT 50
  `) as Row[];

  const documents = (await sql`
    SELECT id, to_char(ts, 'YYYY-MM-DD HH24:MI') AS at, filename,
      size_bytes, page_count, source, status
    FROM pdf_documents
    WHERE anon_id = ${anonId}
    ORDER BY ts DESC LIMIT 25
  `) as Row[];

  return {
    profile: {
      anonId,
      ipHash: profile.ip_hash ? String(profile.ip_hash) : "",
      firstSeen: String(profile.first_seen),
      lastSeen: String(profile.last_seen),
      events: num(profile.events),
      visits: num(profile.visits),
      country: String(profile.country ?? ""),
      region: String(profile.region ?? ""),
      city: String(profile.city ?? ""),
      device: String(profile.device ?? ""),
      browser: String(profile.browser ?? ""),
      os: String(profile.os ?? ""),
      lang: String(profile.lang ?? ""),
      tz: String(profile.tz ?? ""),
      referrer: String(profile.referrer ?? ""),
    },
    events: events.map((r) => ({
      at: String(r.at),
      event: String(r.event),
      page: String(r.page ?? ""),
      detail: String(r.detail ?? ""),
    })),
    documents: documents.map((r) => ({
      id: num(r.id),
      at: String(r.at),
      filename: String(r.filename),
      sizeBytes: num(r.size_bytes),
      pageCount: num(r.page_count),
      source: String(r.source),
      status: String(r.status),
    })),
  };
}

// ─── Geography ────────────────────────────────────────────────────────────────

export async function getGeo(days: number) {
  const sql = getSql();

  const countries = (await sql`
    SELECT country, count(DISTINCT anon_id) AS visitors, count(*) AS events
    FROM events
    WHERE ts > now() - make_interval(days => ${days}) AND coalesce(country, '') <> ''
    GROUP BY country ORDER BY visitors DESC LIMIT 50
  `) as Row[];

  const cities = (await sql`
    SELECT city, country, max(region) AS region, count(DISTINCT anon_id) AS visitors
    FROM events
    WHERE ts > now() - make_interval(days => ${days}) AND coalesce(city, '') <> ''
    GROUP BY city, country ORDER BY visitors DESC LIMIT 100
  `) as Row[];

  // Coarse 0.1° binning — heatmap fidelity without per-visitor precision.
  const points = (await sql`
    SELECT round(lat::numeric, 1) AS lat, round(lon::numeric, 1) AS lon,
      count(DISTINCT anon_id) AS visitors
    FROM events
    WHERE ts > now() - make_interval(days => ${days})
      AND lat IS NOT NULL AND lon IS NOT NULL
    GROUP BY 1, 2 ORDER BY visitors DESC LIMIT 500
  `) as Row[];

  return {
    countries: countries.map((r) => ({
      country: String(r.country),
      visitors: num(r.visitors),
      events: num(r.events),
    })),
    cities: cities.map((r) => ({
      city: String(r.city),
      country: String(r.country ?? ""),
      region: String(r.region ?? ""),
      visitors: num(r.visitors),
    })),
    points: points.map((r) => ({
      lat: Number(r.lat),
      lon: Number(r.lon),
      visitors: num(r.visitors),
    })),
  };
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

// ─── Documents (pdf_documents metadata rows) ──────────────────────────────────
// Filter types + SQL assembly live in ./queryHelpers (pure, unit-tested).

export async function getDocuments(f: DocumentFilters) {
  const sql = getSql();
  const { text, countText, params } = buildDocumentsQuery(f);

  const [countRow] = (await sql.query(countText, params)) as Row[];
  const rows = (await sql.query(text, [
    ...params,
    f.pageSize,
    (f.page - 1) * f.pageSize,
  ])) as Row[];

  return {
    rows: rows.map((r) => ({
      id: num(r.id),
      at: String(r.at),
      filename: String(r.filename),
      sizeBytes: num(r.size_bytes),
      pageCount: num(r.page_count),
      sha256: r.sha256 ? String(r.sha256) : "",
      title: String(r.title ?? ""),
      author: String(r.author ?? ""),
      subject: String(r.subject ?? ""),
      keywords: String(r.keywords ?? ""),
      creator: String(r.creator ?? ""),
      producer: String(r.producer ?? ""),
      pdfCreated: String(r.pdf_created ?? ""),
      pdfModified: String(r.pdf_modified ?? ""),
      source: String(r.source),
      status: String(r.status),
      processingMs: num(r.processing_ms),
      country: String(r.country ?? ""),
      city: String(r.city ?? ""),
      anonId: String(r.anon_id ?? ""),
      duplicates: num(r.duplicates),
    })),
    total: num(countRow?.total),
    page: f.page,
    pageSize: f.pageSize,
  };
}

export async function getDocInsights(days: number) {
  const sql = getSql();

  const [cards] = (await sql`
    SELECT
      count(*)                                        AS total_docs,
      coalesce(sum(size_bytes), 0)                    AS total_bytes,
      avg(size_bytes)                                 AS avg_bytes,
      avg(page_count)                                 AS avg_pages,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY page_count) AS median_pages,
      avg(processing_ms)                              AS avg_processing_ms,
      count(*) FILTER (WHERE status = 'error')        AS errors,
      (SELECT count(*) FROM (
         SELECT sha256 FROM pdf_documents
         WHERE coalesce(sha256, '') <> ''
           AND ts > now() - make_interval(days => ${days})
         GROUP BY sha256 HAVING count(*) > 1
       ) d)                                           AS dup_groups
    FROM pdf_documents
    WHERE ts > now() - make_interval(days => ${days})
  `) as Row[];

  const daily = (await sql`
    SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
      count(p.*) AS uploads,
      coalesce(sum(p.size_bytes), 0) AS bytes,
      round(avg(p.processing_ms)) AS avg_processing_ms
    FROM generate_series(
      date_trunc('day', now()) - make_interval(days => ${days} - 1),
      date_trunc('day', now()),
      interval '1 day'
    ) AS d(day)
    LEFT JOIN pdf_documents p ON p.ts >= d.day AND p.ts < d.day + interval '1 day'
    GROUP BY d.day ORDER BY d.day
  `) as Row[];

  // 10 × 5MB buckets across the 50MB per-file limit.
  const sizeHistogram = (await sql`
    SELECT width_bucket(size_bytes, 0, 52428800, 10) AS bucket, count(*) AS docs
    FROM pdf_documents
    WHERE ts > now() - make_interval(days => ${days}) AND size_bytes IS NOT NULL
    GROUP BY 1 ORDER BY 1
  `) as Row[];

  const pageHistogram = (await sql`
    SELECT width_bucket(page_count, 0, 200, 10) AS bucket, count(*) AS docs
    FROM pdf_documents
    WHERE ts > now() - make_interval(days => ${days}) AND page_count IS NOT NULL
    GROUP BY 1 ORDER BY 1
  `) as Row[];

  const largest = (await sql`
    SELECT filename, size_bytes, page_count, to_char(ts, 'YYYY-MM-DD') AS at
    FROM pdf_documents
    WHERE ts > now() - make_interval(days => ${days}) AND size_bytes IS NOT NULL
    ORDER BY size_bytes DESC LIMIT 10
  `) as Row[];

  const topFilenames = (await sql`
    SELECT filename, count(*) AS uploads
    FROM pdf_documents
    WHERE ts > now() - make_interval(days => ${days})
    GROUP BY filename HAVING count(*) > 1
    ORDER BY uploads DESC LIMIT 10
  `) as Row[];

  // "Document types" ≈ producing application (Word, LaTeX, scanner, …).
  const topProducers = (await sql`
    SELECT coalesce(nullif(producer, ''), nullif(creator, ''), 'Unknown') AS producer,
      count(*) AS docs
    FROM pdf_documents
    WHERE ts > now() - make_interval(days => ${days})
    GROUP BY 1 ORDER BY 2 DESC LIMIT 10
  `) as Row[];

  return {
    cards: {
      totalDocs: num(cards?.total_docs),
      totalBytes: num(cards?.total_bytes),
      avgBytes: num(cards?.avg_bytes),
      avgPages: num(cards?.avg_pages),
      medianPages: num(cards?.median_pages),
      avgProcessingMs: num(cards?.avg_processing_ms),
      errors: num(cards?.errors),
      dupGroups: num(cards?.dup_groups),
    },
    daily: daily.map((r) => ({
      date: String(r.date),
      uploads: num(r.uploads),
      bytes: num(r.bytes),
      avgProcessingMs: num(r.avg_processing_ms),
    })),
    sizeHistogram: sizeHistogram.map((r) => ({
      bucket: num(r.bucket),
      label: `${(num(r.bucket) - 1) * 5}–${num(r.bucket) * 5}MB`,
      docs: num(r.docs),
    })),
    pageHistogram: pageHistogram.map((r) => ({
      bucket: num(r.bucket),
      label: `${(num(r.bucket) - 1) * 20}–${num(r.bucket) * 20}p`,
      docs: num(r.docs),
    })),
    largest: largest.map((r) => ({
      filename: String(r.filename),
      sizeBytes: num(r.size_bytes),
      pageCount: num(r.page_count),
      at: String(r.at),
    })),
    topFilenames: topFilenames.map((r) => ({
      filename: String(r.filename),
      uploads: num(r.uploads),
    })),
    topProducers: topProducers.map((r) => ({
      producer: String(r.producer),
      docs: num(r.docs),
    })),
  };
}

export async function deleteDocuments(opts: {
  ids?: number[];
  sha256?: string;
}): Promise<{ deleted: number }> {
  const sql = getSql();
  if (opts.ids?.length) {
    const rows = (await sql`
      DELETE FROM pdf_documents WHERE id = ANY(${opts.ids}) RETURNING id
    `) as Row[];
    return { deleted: rows.length };
  }
  if (opts.sha256) {
    const rows = (await sql`
      DELETE FROM pdf_documents WHERE sha256 = ${opts.sha256} RETURNING id
    `) as Row[];
    return { deleted: rows.length };
  }
  return { deleted: 0 };
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export async function getFeedback(f: FeedbackFilters) {
  const sql = getSql();
  const { text, countText, params } = buildFeedbackQuery(f);

  const [countRow] = (await sql.query(countText, params)) as Row[];
  const rows = (await sql.query(text, [
    ...params,
    f.pageSize,
    (f.page - 1) * f.pageSize,
  ])) as Row[];

  return {
    rows: rows.map((r) => ({
      id: num(r.id),
      at: String(r.at),
      category: String(r.category),
      message: String(r.message),
      email: r.email ? String(r.email) : "",
      page: String(r.page ?? ""),
      country: String(r.country ?? ""),
      browser: String(r.browser ?? ""),
      os: String(r.os ?? ""),
      device: String(r.device ?? ""),
      status: String(r.status),
      adminNote: String(r.admin_note ?? ""),
    })),
    total: num(countRow?.total),
    newCount: num(countRow?.new_count),
    page: f.page,
    pageSize: f.pageSize,
  };
}

export async function updateFeedback(
  id: number,
  patch: { status?: "new" | "resolved"; adminNote?: string }
): Promise<{ updated: number }> {
  const sql = getSql();
  if (patch.status) {
    await sql`UPDATE feedback SET status = ${patch.status} WHERE id = ${id}`;
  }
  if (patch.adminNote != null) {
    await sql`UPDATE feedback SET admin_note = ${patch.adminNote.slice(0, 1000)} WHERE id = ${id}`;
  }
  return { updated: 1 };
}

export async function deleteFeedback(ids: number[]): Promise<{ deleted: number }> {
  if (!ids.length) return { deleted: 0 };
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM feedback WHERE id = ANY(${ids}) RETURNING id
  `) as Row[];
  return { deleted: rows.length };
}

// ─── Report export (CSV / JSON) ───────────────────────────────────────────────
// No native .xlsx: CSV opens directly in Excel, and a spreadsheet library
// would add ~1MB to the serverless bundle for no real gain (see
// docs/ANALYTICS_V2.md). If real xlsx is ever needed, use exceljs on a
// dedicated route.

const EXPORT_PAGE_SIZE = 1000;

async function buildReport(
  report: string,
  days: number
): Promise<{ name: string; headers: string[]; rows: (string | number | null)[][] }> {
  if (report === "daily") {
    const { series } = await getOverview(days);
    return {
      name: "daily",
      headers: ["date", "visitors", "sessions", "pageviews", "uploads", "searches"],
      rows: series.map((r) => [r.date, r.visitors, r.sessions, r.pageviews, r.uploads, r.searches]),
    };
  }

  if (report === "terms") {
    const { topTerms } = await getProduct(days);
    return {
      name: "top-terms",
      headers: ["term", "searches", "with_results", "avg_matches"],
      rows: topTerms.map((t) => [t.term, t.searches, t.withResults, t.avgMatches]),
    };
  }

  if (report === "funnel") {
    const f = await getFunnel(days);
    return {
      name: "funnel",
      headers: ["stage", "sessions"],
      rows: [
        ["Visited", f.sessions],
        ["Loaded PDFs", f.withUpload],
        ["Searched", f.withSearch],
        ["Found results", f.withSuccess],
        ["Exported CSV", f.withExport],
      ],
    };
  }

  if (report === "retention") {
    const cohorts = await getRetention();
    const maxWeeks = Math.max(0, ...cohorts.map((c) => c.weeks.length));
    return {
      name: "retention",
      headers: ["cohort_week", "size", ...Array.from({ length: maxWeeks }, (_, i) => `week_${i}`)],
      rows: cohorts.map((c) => [
        c.cohort,
        c.size,
        ...Array.from({ length: maxWeeks }, (_, i) => c.weeks[i] ?? ""),
      ]),
    };
  }

  if (report === "visitors") {
    const { rows } = await getVisitors({ days, page: 1, pageSize: EXPORT_PAGE_SIZE });
    return {
      name: "visitors",
      headers: [
        "visitor_id", "ip_hash", "first_seen", "last_seen", "visits", "events",
        "country", "region", "city", "device", "browser", "os", "language", "timezone", "referrer",
      ],
      rows: rows.map((v) => [
        v.anonId, v.ipHash, v.firstSeen, v.lastSeen, v.visits, v.events,
        v.country, v.region, v.city, v.device, v.browser, v.os, v.lang, v.tz, v.referrer,
      ]),
    };
  }

  if (report === "geo") {
    const { countries, cities } = await getGeo(days);
    return {
      name: "geo",
      headers: ["type", "country", "region", "city", "visitors", "events"],
      rows: [
        ...countries.map((c): (string | number | null)[] => [
          "country", c.country, "", "", c.visitors, c.events,
        ]),
        ...cities.map((c): (string | number | null)[] => [
          "city", c.country, c.region, c.city, c.visitors, null,
        ]),
      ],
    };
  }

  if (report === "documents") {
    const { rows } = await getDocuments({ page: 1, pageSize: EXPORT_PAGE_SIZE });
    return {
      name: "documents",
      headers: [
        "uploaded_at", "filename", "size_bytes", "page_count", "sha256",
        "title", "author", "subject", "keywords", "producer",
        "source", "status", "processing_ms", "country", "city", "duplicates",
      ],
      rows: rows.map((d) => [
        d.at, d.filename, d.sizeBytes, d.pageCount, d.sha256,
        d.title, d.author, d.subject, d.keywords, d.producer,
        d.source, d.status, d.processingMs, d.country, d.city, d.duplicates,
      ]),
    };
  }

  if (report === "feedback") {
    const { rows } = await getFeedback({ page: 1, pageSize: EXPORT_PAGE_SIZE });
    return {
      name: "feedback",
      headers: [
        "received_at", "category", "status", "message", "email",
        "page", "country", "device", "os", "browser",
      ],
      rows: rows.map((r) => [
        r.at, r.category, r.status, r.message, r.email,
        r.page, r.country, r.device, r.os, r.browser,
      ]),
    };
  }

  throw new Error(`Unknown report: ${report}`);
}

export async function exportReport(
  report: string,
  days: number,
  format: "csv" | "json"
): Promise<{ filename: string; contentType: string; body: string }> {
  const stamp = new Date().toISOString().slice(0, 10);
  const { name, headers, rows } = await buildReport(report, days);

  if (format === "json") {
    const objects = rows.map((r) =>
      Object.fromEntries(headers.map((h, i) => [h, r[i] ?? null]))
    );
    return {
      filename: `pdfsearch-${name}-${stamp}.json`,
      contentType: "application/json",
      body: JSON.stringify(objects, null, 2),
    };
  }

  return {
    filename: `pdfsearch-${name}-${stamp}.csv`,
    contentType: "text/csv; charset=utf-8",
    body: toCsv(headers, rows),
  };
}
