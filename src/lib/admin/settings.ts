/**
 * Persistence for admin-editable runtime settings (app_settings table).
 *
 * The geo rules are read from middleware, which runs on every matched
 * request, so reads go through a short in-memory cache: one DB round trip
 * per isolate per TTL, not one per request.
 */

import { getSql, isDbConfigured } from "@/lib/db";
import {
  DEFAULT_GEO_RULES,
  normalizeCountryCodes,
  type GeoRules,
} from "@/lib/admin/geoRules";

const GEO_KEY = "geo_rules";
const CACHE_TTL_MS = 60_000;

let cached: { rules: GeoRules; at: number } | null = null;

/** Coerce whatever is in the DB into a valid GeoRules. */
function parseRules(value: unknown): GeoRules {
  if (!value || typeof value !== "object") return DEFAULT_GEO_RULES;
  const v = value as Record<string, unknown>;
  return {
    enabled: v.enabled === true,
    mode: v.mode === "allow" ? "allow" : "deny",
    scope: v.scope === "site" ? "site" : "admin",
    countries: normalizeCountryCodes(v.countries),
  };
}

/**
 * Read the geo rules.
 *
 * Every failure path returns the default (disabled) rules: a database blip
 * must never start blocking traffic, and must never lock the admin out.
 */
export async function getGeoRules(force = false): Promise<GeoRules> {
  if (process.env.DISABLE_GEO_RESTRICTIONS === "true") {
    return DEFAULT_GEO_RULES;
  }
  if (!isDbConfigured()) return DEFAULT_GEO_RULES;

  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.rules;
  }

  try {
    const rows = (await getSql().query(
      `SELECT value FROM app_settings WHERE key = $1`,
      [GEO_KEY]
    )) as { value: unknown }[];
    const rules = rows.length > 0 ? parseRules(rows[0].value) : DEFAULT_GEO_RULES;
    cached = { rules, at: Date.now() };
    return rules;
  } catch {
    // Fail open. Blocking visitors because a query failed would be a far
    // worse outcome than briefly not enforcing the rules.
    cached = { rules: DEFAULT_GEO_RULES, at: Date.now() };
    return DEFAULT_GEO_RULES;
  }
}

export async function setGeoRules(rules: GeoRules): Promise<void> {
  const sql = getSql();
  await sql.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [GEO_KEY, JSON.stringify(rules)]
  );
  cached = { rules, at: Date.now() };
}

/** Drop the cache — used after a write from another isolate. */
export function invalidateGeoCache(): void {
  cached = null;
}
