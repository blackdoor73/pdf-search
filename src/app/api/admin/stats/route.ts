/**
 * First-party analytics API for the admin dashboard.
 *
 * GET /api/admin/stats?section=<overview|product|retention|system|realtime|funnel|alerts>&days=N
 *
 * Auth is enforced by middleware. Returns { configured: false } when no
 * DATABASE_URL is set so the UI can render setup instructions.
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, isDbConfigured } from "@/lib/db";
import {
  clampDays,
  getAlerts,
  getFunnel,
  getOverview,
  getProduct,
  getRealtime,
  getRetention,
  getSystem,
} from "@/lib/admin/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ configured: false });
  }

  const section = req.nextUrl.searchParams.get("section") ?? "overview";
  const days = clampDays(req.nextUrl.searchParams.get("days"));

  try {
    await ensureSchema();

    switch (section) {
      case "overview":
        return NextResponse.json({ configured: true, ...(await getOverview(days)) });
      case "product":
        return NextResponse.json({ configured: true, ...(await getProduct(days)) });
      case "retention":
        return NextResponse.json({ configured: true, cohorts: await getRetention() });
      case "system":
        return NextResponse.json({ configured: true, ...(await getSystem()) });
      case "realtime":
        return NextResponse.json({ configured: true, ...(await getRealtime()) });
      case "funnel":
        return NextResponse.json({ configured: true, ...(await getFunnel(days)) });
      case "alerts":
        return NextResponse.json({ configured: true, alerts: await getAlerts() });
      default:
        return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
    }
  } catch (err) {
    console.error(`[admin/stats] ${section} failed:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 }
    );
  }
}
