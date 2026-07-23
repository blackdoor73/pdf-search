/**
 * Report export.
 *
 * GET /api/admin/export?report=<daily|terms|funnel|retention|visitors|geo|documents>
 *                      &days=N&format=<csv|json>
 *
 * CSV opens directly in Excel — no native .xlsx (see docs/ANALYTICS_V2.md).
 */

import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, isDbConfigured } from "@/lib/db";
import { clampDays, exportReport } from "@/lib/admin/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  const report = req.nextUrl.searchParams.get("report") ?? "daily";
  const days = clampDays(req.nextUrl.searchParams.get("days"));
  const format =
    req.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";

  try {
    await ensureSchema();
    const { filename, contentType, body } = await exportReport(report, days, format);
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
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
