/**
 * Country access rules — pure decision logic, no I/O.
 *
 * Two hard guarantees this module exists to enforce:
 *
 * 1. **Search rankings are never collateral damage.** Real search-engine
 *    crawlers are allowed through before any country test runs, and the
 *    files crawlers need (robots.txt, sitemap.xml, static assets) are never
 *    geo-checked at all.
 * 2. **Absence of geo data means allow.** Local dev and any non-Vercel host
 *    send no country header; failing open there is the only safe default.
 *
 * Note this is *not* a security control — a VPN defeats country blocking in
 * seconds. It trims casual noise; the admin password is the real gate.
 *
 * Pure and dependency-free so it is unit-testable under `node --test`.
 */

/**
 * Genuine search-engine crawlers, kept deliberately narrow.
 *
 * The telemetry bot list (analytics/bots.ts) matches "curl", "scrape",
 * "python-requests" and friends — correct for excluding junk from analytics,
 * but useless here: anyone could send `User-Agent: curl` and walk straight
 * through the block. Only the crawlers whose access protects SEO belong here.
 */
const SEARCH_ENGINE_UA_RE =
  /(googlebot|google-inspectiontool|storebot-google|adsbot-google|mediapartners-google|bingbot|adidxbot|duckduckbot|applebot|yandexbot|baiduspider|slurp)/i;

/**
 * Paths that are never geo-checked, so discovery and rendering keep working
 * even for a blocked region.
 */
const ALWAYS_ALLOWED_PREFIXES = [
  "/_next/",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon",
  "/icon-",
  "/opengraph-image",
  "/twitter-image",
  "/pdf.worker.min.mjs",
  "/api/track", // never break telemetry — it is how we would see a misfire
];

export type GeoMode = "deny" | "allow";
export type GeoScope = "admin" | "site";

export interface GeoRules {
  enabled: boolean;
  /** "deny" blocks the listed countries; "allow" blocks everything else. */
  mode: GeoMode;
  /** ISO-3166-1 alpha-2, uppercase. */
  countries: string[];
  /** "admin" guards only /admin; "site" guards every page. */
  scope: GeoScope;
}

export const DEFAULT_GEO_RULES: GeoRules = {
  enabled: false,
  mode: "deny",
  countries: [],
  scope: "admin",
};

export interface AccessInput {
  pathname: string;
  /** x-vercel-ip-country, or null when unavailable. */
  country: string | null;
  userAgent: string;
  rules: GeoRules;
}

export interface AccessDecision {
  allowed: boolean;
  /** Why — surfaced in logs, never to the blocked visitor. */
  reason: string;
}

export function isSearchEngineCrawler(userAgent: string): boolean {
  return SEARCH_ENGINE_UA_RE.test(userAgent ?? "");
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin");
}

function isAlwaysAllowedPath(pathname: string): boolean {
  return ALWAYS_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Decide whether a request may proceed. Order matters — the SEO exemptions
 * are deliberately evaluated before any country comparison.
 */
export function evaluateAccess({
  pathname,
  country,
  userAgent,
  rules,
}: AccessInput): AccessDecision {
  if (!rules.enabled) return { allowed: true, reason: "rules disabled" };
  if (rules.countries.length === 0) {
    // An empty allow-list would otherwise block the entire world.
    return { allowed: true, reason: "no countries configured" };
  }

  if (isAlwaysAllowedPath(pathname)) {
    return { allowed: true, reason: "exempt path" };
  }
  if (isSearchEngineCrawler(userAgent)) {
    return { allowed: true, reason: "search engine crawler" };
  }
  if (rules.scope === "admin" && !isAdminPath(pathname)) {
    return { allowed: true, reason: "public path, admin-only scope" };
  }
  if (!country) {
    // No geo data: local dev, self-hosted, or a header Vercel didn't set.
    return { allowed: true, reason: "no geo data" };
  }

  const cc = country.toUpperCase();
  const listed = rules.countries.includes(cc);
  if (rules.mode === "deny") {
    return listed
      ? { allowed: false, reason: `country ${cc} is denied` }
      : { allowed: true, reason: `country ${cc} not on deny list` };
  }
  return listed
    ? { allowed: true, reason: `country ${cc} is allowed` }
    : { allowed: false, reason: `country ${cc} not on allow list` };
}

/** Uppercase, de-duplicate, and drop anything that isn't a 2-letter code. */
export function normalizeCountryCodes(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const cc = raw.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(cc)) out.add(cc);
  }
  return [...out].sort();
}

/**
 * Would saving these rules lock this admin out of the dashboard?
 *
 * Called before every save. Being unable to reach /admin because you blocked
 * your own country is the one failure this feature could plausibly cause.
 */
export function wouldLockOut(
  rules: GeoRules,
  currentCountry: string | null
): boolean {
  if (!rules.enabled || !currentCountry) return false;
  if (rules.countries.length === 0) return false;
  const decision = evaluateAccess({
    pathname: "/admin",
    country: currentCountry,
    userAgent: "Mozilla/5.0",
    rules,
  });
  return !decision.allowed;
}

/**
 * Countries whose blocking would measurably damage SEO, because major
 * crawlers originate there. Googlebot crawls predominantly from US ranges.
 */
export const CRAWLER_ORIGIN_COUNTRIES = ["US"];

export function seoRiskCountries(rules: GeoRules): string[] {
  if (!rules.enabled) return [];
  if (rules.scope !== "site") return []; // admin-only can't affect crawling
  if (rules.mode === "deny") {
    return rules.countries.filter((c) => CRAWLER_ORIGIN_COUNTRIES.includes(c));
  }
  // Allow-list: risk is a crawler origin being *absent*.
  return CRAWLER_ORIGIN_COUNTRIES.filter((c) => !rules.countries.includes(c));
}
