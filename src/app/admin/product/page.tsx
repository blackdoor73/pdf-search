"use client";

/**
 * Product metrics — uploads, in-PDF search behavior, top terms,
 * success rates, and weekly retention cohorts.
 */

import { useState } from "react";
import { BarsChart, CohortGrid, TrendChart } from "@/components/admin/charts";
import {
  ConfigNotice,
  DataTable,
  ErrorPanel,
  ExportButton,
  LoadingPanel,
  Panel,
  RangePicker,
  StatCard,
} from "@/components/admin/ui";
import { fmtBytes, fmtMs, fmtNum, fmtPct, useAdminData } from "@/components/admin/useAdminData";

interface ProductData {
  configured: boolean;
  avgFileBytes: number;
  avgSearchMs: number;
  p95SearchMs: number;
  searches: number;
  searchSuccessRate: number | null;
  pdfsUploaded: number;
  avgUploadsPerUser: number | null;
  avgFilesPerSearch: number;
  searchesPerSession: number | null;
  uploadsPerHour: { hour: string; uploads: number; searches: number }[];
  topTerms: { term: string; searches: number; withResults: number; avgMatches: number }[];
  zeroResultTerms: { term: string; searches: number }[];
  successSeries: { date: string; searches: number; withResults: number }[];
}

interface RetentionData {
  configured: boolean;
  cohorts: { cohort: string; size: number; weeks: number[] }[];
}

export default function AdminProductPage() {
  const [days, setDays] = useState(30);
  const { data, error, loading } = useAdminData<ProductData>(
    `/api/admin/stats?section=product&days=${days}`
  );
  const { data: retention } = useAdminData<RetentionData>(
    "/api/admin/stats?section=retention"
  );

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  if (data && !data.configured) {
    return <ConfigNotice service="Telemetry database" envVars={["DATABASE_URL"]} docsAnchor="neon" />;
  }
  if (!data) return null;

  const hourly = data.uploadsPerHour.map((h) => ({
    ...h,
    hour: h.hour.slice(11), // keep HH:00
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-mono text-lg font-semibold text-[var(--text)]">Product</h1>
        <div className="flex items-center gap-4">
          <ExportButton report="terms" days={days} />
          <RangePicker days={days} onChange={setDays} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="PDFs loaded" value={fmtNum(data.pdfsUploaded)} accent="accent" sub={`${days} days`} />
        <StatCard
          label="Avg PDFs / user"
          value={data.avgUploadsPerUser ? data.avgUploadsPerUser.toFixed(1) : "—"}
        />
        <StatCard label="Avg file size" value={fmtBytes(data.avgFileBytes)} />
        <StatCard
          label="Searches / session"
          value={data.searchesPerSession ? data.searchesPerSession.toFixed(1) : "—"}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Searches" value={fmtNum(data.searches)} accent="blue" sub={`${days} days`} />
        <StatCard
          label="Search success rate"
          value={fmtPct(data.searchSuccessRate)}
          accent={data.searchSuccessRate != null && data.searchSuccessRate < 0.5 ? "red" : "green"}
          sub="searches with ≥1 match"
        />
        <StatCard label="Avg search time" value={fmtMs(data.avgSearchMs)} />
        <StatCard label="p95 search time" value={fmtMs(data.p95SearchMs)} />
      </div>

      <Panel title="Activity per hour — last 48h">
        <BarsChart
          data={hourly}
          xKey="hour"
          series={[
            { key: "uploads", label: "PDFs loaded" },
            { key: "searches", label: "Searches", color: "#5b9cf6" },
          ]}
          height={200}
        />
      </Panel>

      <Panel title="Search success vs no-result">
        <TrendChart
          data={data.successSeries}
          xKey="date"
          series={[
            { key: "searches", label: "Total searches", color: "#5b9cf6" },
            { key: "withResults", label: "With results", color: "#4caf79" },
          ]}
          height={200}
        />
      </Panel>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Most searched terms">
          <DataTable
            headers={["Term", "Searches", "Hit rate", "Avg matches"]}
            align={["l", "r", "r", "r"]}
            rows={data.topTerms.map((t) => [
              t.term,
              t.searches,
              t.searches ? `${Math.round((t.withResults / t.searches) * 100)}%` : "—",
              t.avgMatches,
            ])}
          />
        </Panel>
        <Panel title="Zero-result searches">
          <DataTable
            headers={["Term", "Failed searches"]}
            align={["l", "r"]}
            rows={data.zeroResultTerms.map((t) => [t.term, t.searches])}
          />
        </Panel>
      </div>

      <Panel
        title="Weekly retention cohorts"
        action={<ExportButton report="retention" days={days} />}
      >
        <CohortGrid cohorts={retention?.cohorts ?? []} />
      </Panel>
    </div>
  );
}
