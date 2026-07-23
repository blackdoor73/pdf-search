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
  clampPage,
  clampPageSize,
  getAlerts,
  getDocInsights,
  getFirstPartySources,
  getFunnel,
  getGeo,
  getOverview,
  getProduct,
  getRealtime,
  getRetention,
  getSystem,
  getVisitorDetail,
  getVisitors,
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
      case "sources":
        return NextResponse.json({ configured: true, sources: await getFirstPartySources(days) });
      case "visitors": {
        const p = req.nextUrl.searchParams;
        return NextResponse.json({
          configured: true,
          ...(await getVisitors({
            days,
            page: clampPage(p.get("page")),
            pageSize: clampPageSize(p.get("pageSize")),
            country: p.get("country") ?? undefined,
            device: p.get("device") ?? undefined,
            q: p.get("q")?.slice(0, 64) ?? undefined,
          })),
        });
      }
      case "visitor": {
        const id = req.nextUrl.searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        const detail = await getVisitorDetail(id.slice(0, 64));
        if (!detail) return NextResponse.json({ error: "Visitor not found" }, { status: 404 });
        return NextResponse.json({ configured: true, ...detail });
      }
      case "geo":
        return NextResponse.json({ configured: true, ...(await getGeo(days)) });
      case "docinsights":
        return NextResponse.json({ configured: true, ...(await getDocInsights(days)) });
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
