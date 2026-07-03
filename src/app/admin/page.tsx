"use client";

/**
 * Admin Overview — growth KPIs, anomaly alerts, and the core trend charts.
 */

import { useState } from "react";
import { TrendChart } from "@/components/admin/charts";
import {
  AlertsBanner,
  ConfigNotice,
  ErrorPanel,
  ExportButton,
  LoadingPanel,
  Panel,
  RangePicker,
  StatCard,
} from "@/components/admin/ui";
import { fmtNum, useAdminData } from "@/components/admin/useAdminData";
import type { Alert } from "@/lib/admin/queries";

interface OverviewData {
  configured: boolean;
  kpis: Record<string, number>;
  series: {
    date: string;
    visitors: number;
    sessions: number;
    uploads: number;
    searches: number;
    pageviews: number;
  }[];
}

export default function AdminOverviewPage() {
  const [days, setDays] = useState(30);
  const { data, error, loading } = useAdminData<OverviewData>(
    `/api/admin/stats?section=overview&days=${days}`
  );
  const { data: alertsData } = useAdminData<{ alerts: Alert[] }>(
    "/api/admin/stats?section=alerts",
    { refreshMs: 120_000 }
  );

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  if (data && !data.configured) {
    return <ConfigNotice service="Telemetry database" envVars={["DATABASE_URL"]} docsAnchor="neon" />;
  }
  if (!data) return null;

  const k = data.kpis;
  const pagesPerSession =
    k.sessions_30d > 0 ? (k.pageviews_30d / k.sessions_30d).toFixed(1) : "—";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-mono text-lg font-semibold text-[var(--text)]">Overview</h1>
        <div className="flex items-center gap-4">
          <ExportButton report="daily" days={days} />
          <RangePicker days={days} onChange={setDays} />
        </div>
      </div>

      {alertsData?.alerts && <AlertsBanner alerts={alertsData.alerts} />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active now" value={fmtNum(k.active_now)} accent="green" sub="last 5 min" />
        <StatCard label="DAU" value={fmtNum(k.dau)} sub="today" />
        <StatCard label="WAU" value={fmtNum(k.wau)} sub="last 7 days" />
        <StatCard label="MAU" value={fmtNum(k.mau)} sub="last 30 days" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="PDFs today" value={fmtNum(k.uploads_today)} accent="accent" />
        <StatCard label="PDFs 7d / 30d" value={`${fmtNum(k.uploads_7d)} / ${fmtNum(k.uploads_30d)}`} />
        <StatCard label="PDFs lifetime" value={fmtNum(k.uploads_lifetime)} />
        <StatCard label="Pages / session" value={String(pagesPerSession)} sub="30 days" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Searches today" value={fmtNum(k.searches_today)} accent="blue" />
        <StatCard label="Searches 30d" value={fmtNum(k.searches_30d)} />
        <StatCard label="Searches lifetime" value={fmtNum(k.searches_lifetime)} />
        <StatCard label="Users lifetime" value={fmtNum(k.lifetime_users)} />
      </div>

      <Panel title={`Visitors & sessions — last ${days} days`}>
        <TrendChart
          data={data.series}
          xKey="date"
          series={[
            { key: "visitors", label: "Unique visitors" },
            { key: "sessions", label: "Sessions" },
          ]}
        />
      </Panel>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="PDF uploads">
          <TrendChart
            data={data.series}
            xKey="date"
            series={[{ key: "uploads", label: "PDFs uploaded" }]}
            height={200}
          />
        </Panel>
        <Panel title="Searches">
          <TrendChart
            data={data.series}
            xKey="date"
            series={[{ key: "searches", label: "Searches", color: "#5b9cf6" }]}
            height={200}
          />
        </Panel>
      </div>
    </div>
  );
}
