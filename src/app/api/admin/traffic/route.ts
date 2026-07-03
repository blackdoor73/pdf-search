/**
 * GA4 traffic analytics proxy for the admin dashboard.
 *
 * GET /api/admin/traffic?days=N
 *
 * Runs the full set of GA4 reports in parallel and returns one payload.
 * Returns { configured: false } with setup hints when GA4 env vars are unset.
 */

import { NextRequest, NextResponse } from "next/server";
import { clampDays } from "@/lib/admin/queries";
import { ga4Realtime, ga4RunReport, isGaConfigured } from "@/lib/admin/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isGaConfigured()) {
    return NextResponse.json({
      configured: false,
      required: [
        "GOOGLE_SERVICE_ACCOUNT_EMAIL",
        "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
        "GA4_PROPERTY_ID",
      ],
    });
  }

  const days = clampDays(req.nextUrl.searchParams.get("days"));

  try {
    const [series, channels, landingPages, geo, devices, browsers, realtime] =
      await Promise.all([
        ga4RunReport({
          dimensions: ["date"],
          metrics: [
            "activeUsers",
            "sessions",
            "newUsers",
            "screenPageViews",
            "bounceRate",
            "averageSessionDuration",
          ],
          days,
        }),
        ga4RunReport({
          dimensions: ["sessionDefaultChannelGroup"],
          metrics: ["sessions", "activeUsers"],
          days,
          orderByMetric: "sessions",
        }),
        ga4RunReport({
          dimensions: ["landingPage"],
          metrics: ["sessions", "bounceRate", "averageSessionDuration"],
          days,
          limit: 20,
          orderByMetric: "sessions",
        }),
        ga4RunReport({
          dimensions: ["country"],
          metrics: ["activeUsers", "sessions"],
          days,
          limit: 20,
          orderByMetric: "activeUsers",
        }),
        ga4RunReport({
          dimensions: ["deviceCategory"],
          metrics: ["activeUsers"],
          days,
        }),
        ga4RunReport({
          dimensions: ["browser"],
          metrics: ["activeUsers"],
          days,
          limit: 10,
          orderByMetric: "activeUsers",
        }),
        ga4Realtime(),
      ]);

    // GA4 returns dates as YYYYMMDD, unsorted.
    const sortedSeries = series
      .map((r) => ({
        date: `${r.dimensions[0].slice(0, 4)}-${r.dimensions[0].slice(4, 6)}-${r.dimensions[0].slice(6, 8)}`,
        activeUsers: r.metrics[0],
        sessions: r.metrics[1],
        newUsers: r.metrics[2],
        pageviews: r.metrics[3],
        bounceRate: r.metrics[4],
        avgSessionSec: r.metrics[5],
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totals = sortedSeries.reduce(
      (acc, d) => ({
        activeUsers: acc.activeUsers + d.activeUsers,
        sessions: acc.sessions + d.sessions,
        newUsers: acc.newUsers + d.newUsers,
        pageviews: acc.pageviews + d.pageviews,
      }),
      { activeUsers: 0, sessions: 0, newUsers: 0, pageviews: 0 }
    );

    return NextResponse.json({
      configured: true,
      series: sortedSeries,
      totals: {
        ...totals,
        returningUsers: Math.max(0, totals.activeUsers - totals.newUsers),
        pagesPerSession: totals.sessions ? totals.pageviews / totals.sessions : 0,
      },
      channels: channels.map((r) => ({
        channel: r.dimensions[0],
        sessions: r.metrics[0],
        users: r.metrics[1],
      })),
      landingPages: landingPages.map((r) => ({
        page: r.dimensions[0],
        sessions: r.metrics[0],
        bounceRate: r.metrics[1],
        avgSessionSec: r.metrics[2],
      })),
      geo: geo.map((r) => ({
        country: r.dimensions[0],
        users: r.metrics[0],
        sessions: r.metrics[1],
      })),
      devices: devices.map((r) => ({
        device: r.dimensions[0],
        users: r.metrics[0],
      })),
      browsers: browsers.map((r) => ({
        browser: r.dimensions[0],
        users: r.metrics[0],
      })),
      realtime,
    });
  } catch (err) {
    console.error("[admin/traffic] GA4 request failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "GA4 request failed" },
      { status: 502 }
    );
  }
}
