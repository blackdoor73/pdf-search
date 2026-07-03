/**
 * Google Analytics 4 (Data API) + Search Console integration.
 *
 * Authenticates with a service account via the JWT-bearer OAuth flow using
 * node:crypto — no googleapis dependency (saves ~10MB in the lambda).
 *
 * Env:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL   e.g. analytics@project.iam.gserviceaccount.com
 * - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  PEM key ("\n" escapes are handled)
 * - GA4_PROPERTY_ID                numeric GA4 property id
 * - GSC_SITE_URL                   e.g. sc-domain:pdfsearch.info or https://www.pdfsearch.info/
 *
 * Setup: grant the service account "Viewer" on the GA4 property and add it
 * as a (restricted) user on the Search Console property.
 */

import { createSign } from "node:crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
].join(" ");

export function isGaConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GA4_PROPERTY_ID
  );
}

export function isGscConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GSC_SITE_URL
  );
}

// ─── OAuth token (module-level cache) ─────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null;

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: email,
      scope: SCOPES,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(key))}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

async function googleFetch<T>(url: string, body: unknown): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Google API error (${res.status}): ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// ─── GA4 Data API ──────────────────────────────────────────────────────────────

interface Ga4Row {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
}
interface Ga4Response {
  rows?: Ga4Row[];
  totals?: Ga4Row[];
}

export interface GaReportRow {
  dimensions: string[];
  metrics: number[];
}

function mapRows(res: Ga4Response): GaReportRow[] {
  return (res.rows ?? []).map((r) => ({
    dimensions: (r.dimensionValues ?? []).map((d) => d.value),
    metrics: (r.metricValues ?? []).map((m) => Number(m.value)),
  }));
}

export async function ga4RunReport(opts: {
  dimensions: string[];
  metrics: string[];
  days: number;
  limit?: number;
  orderByMetric?: string;
}): Promise<GaReportRow[]> {
  const property = process.env.GA4_PROPERTY_ID!;
  const res = await googleFetch<Ga4Response>(
    `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
    {
      dateRanges: [{ startDate: `${opts.days}daysAgo`, endDate: "today" }],
      dimensions: opts.dimensions.map((name) => ({ name })),
      metrics: opts.metrics.map((name) => ({ name })),
      limit: opts.limit ?? 100,
      ...(opts.orderByMetric
        ? { orderBys: [{ metric: { metricName: opts.orderByMetric }, desc: true }] }
        : {}),
    }
  );
  return mapRows(res);
}

export async function ga4Realtime(): Promise<{
  activeUsers: number;
  byCountry: GaReportRow[];
}> {
  const property = process.env.GA4_PROPERTY_ID!;
  const res = await googleFetch<Ga4Response>(
    `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runRealtimeReport`,
    {
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
      limit: 20,
    }
  );
  const rows = mapRows(res);
  return {
    activeUsers: rows.reduce((sum, r) => sum + (r.metrics[0] ?? 0), 0),
    byCountry: rows,
  };
}

// ─── Search Console ────────────────────────────────────────────────────────────

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function gscQuery(opts: {
  dimension: "query" | "page";
  days: number;
  limit?: number;
}): Promise<GscRow[]> {
  const site = encodeURIComponent(process.env.GSC_SITE_URL!);
  // GSC data lags ~2 days; shift the window accordingly.
  const end = new Date(Date.now() - 2 * 86400_000);
  const start = new Date(end.getTime() - opts.days * 86400_000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const res = await googleFetch<{ rows?: GscRow[] }>(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${site}/searchAnalytics/query`,
    {
      startDate: fmt(start),
      endDate: fmt(end),
      dimensions: [opts.dimension],
      rowLimit: opts.limit ?? 100,
    }
  );
  return res.rows ?? [];
}
