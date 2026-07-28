/**
 * Admin settings API. Auth enforced by middleware (/api/admin/* matcher).
 *
 * GET   -> current geo rules + the caller's detected country + SEO warnings
 * PATCH -> replace the geo rules (refuses a self-lockout)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ensureSchema, isDbConfigured } from "@/lib/db";
import { getGeoRules, setGeoRules } from "@/lib/admin/settings";
import {
  seoRiskCountries,
  wouldLockOut,
  normalizeCountryCodes,
  type GeoRules,
} from "@/lib/admin/geoRules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const geoSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(["deny", "allow"]),
  scope: z.enum(["admin", "site"]),
  countries: z.array(z.string()).max(250),
});

function detectedCountry(req: NextRequest): string | null {
  return req.headers.get("x-vercel-ip-country");
}

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) return NextResponse.json({ configured: false });
  await ensureSchema();

  const rules = await getGeoRules(true);
  return NextResponse.json({
    configured: true,
    rules,
    yourCountry: detectedCountry(req),
    seoRisk: seoRiskCountries(rules),
    // Surfaced so the UI can explain why rules appear inert.
    overriddenByEnv: process.env.DISABLE_GEO_RESTRICTIONS === "true",
    // Site-wide enforcement keeps a DB read off every public page's TTFB
    // unless deliberately switched on. Admin-scope rules always apply.
    siteWideEnabled: process.env.GEO_SITEWIDE === "true",
  });
}

export async function PATCH(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  await ensureSchema();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = geoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_rules", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const rules: GeoRules = {
    ...parsed.data,
    countries: normalizeCountryCodes(parsed.data.countries),
  };

  // The one mistake this feature could plausibly cause: blocking yourself
  // out of the dashboard. Refuse it rather than require an env-var rescue.
  const country = detectedCountry(req);
  if (wouldLockOut(rules, country)) {
    return NextResponse.json(
      {
        error: "would_lock_out",
        message: `These rules would block your own country (${country}), locking you out of the dashboard.`,
        yourCountry: country,
      },
      { status: 409 }
    );
  }

  await setGeoRules(rules);
  return NextResponse.json({
    ok: true,
    rules,
    yourCountry: country,
    seoRisk: seoRiskCountries(rules),
  });
}
