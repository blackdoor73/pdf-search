/**
 * Google Search Console proxy for the admin dashboard.
 *
 * GET /api/admin/gsc?days=N
 *
 * Returns top queries, top pages, and "ranking opportunities" — queries
 * sitting on page 1–2 (position 4–20) with meaningful impressions, where
 * content/title improvements have the highest leverage.
 */

import { NextRequest, NextResponse } from "next/server";
import { clampDays } from "@/lib/admin/queries";
import { gscQuery, isGscConfigured } from "@/lib/admin/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isGscConfigured()) {
    return NextResponse.json({
      configured: false,
      required: [
        "GOOGLE_SERVICE_ACCOUNT_EMAIL",
        "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
        "GSC_SITE_URL",
      ],
    });
  }

  const days = clampDays(req.nextUrl.searchParams.get("days"));

  try {
    const [queries, pages] = await Promise.all([
      gscQuery({ dimension: "query", days, limit: 200 }),
      gscQuery({ dimension: "page", days, limit: 50 }),
    ]);

    const opportunities = queries
      .filter((q) => q.position >= 4 && q.position <= 20 && q.impressions >= 10)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20);

    return NextResponse.json({
      configured: true,
      queries: queries.slice(0, 50).map((q) => ({ key: q.keys[0], ...q, keys: undefined })),
      pages: pages.map((p) => ({ key: p.keys[0], ...p, keys: undefined })),
      opportunities: opportunities.map((q) => ({ key: q.keys[0], ...q, keys: undefined })),
    });
  } catch (err) {
    console.error("[admin/gsc] Search Console request failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search Console request failed" },
      { status: 502 }
    );
  }
}
