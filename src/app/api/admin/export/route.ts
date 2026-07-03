/**
 * CSV report export.
 *
 * GET /api/admin/export?report=<daily|terms|funnel|retention>&days=N
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, isDbConfigured } from "@/lib/db";
import { clampDays, exportCsv } from "@/lib/admin/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const report = req.nextUrl.searchParams.get("report") ?? "daily";
  const days = clampDays(req.nextUrl.searchParams.get("days"));

  try {
    await ensureSchema();
    const { filename, csv } = await exportCsv(report, days);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[admin/export] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 400 }
    );
  }
}
