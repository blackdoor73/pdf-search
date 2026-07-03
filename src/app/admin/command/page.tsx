"use client";

/**
 * Admin Command Center — live view, polls every 5 seconds:
 * activity right now, per-minute load, live event feed, health status.
 */

import { Radio } from "lucide-react";
import { TrendChart } from "@/components/admin/charts";
import {
  ConfigNotice,
  ErrorPanel,
  LoadingPanel,
  Panel,
  StatCard,
} from "@/components/admin/ui";
import { fmtNum, useAdminData } from "@/components/admin/useAdminData";

interface RealtimeData {
  configured: boolean;
  activeNow: number;
  events1h: number;
  uploads1h: number;
  searches1h: number;
  errors1h: number;
  perMinute: { minute: string; pageviews: number; uploads: number; searches: number }[];
  feed: { at: string; event: string; country: string; device: string; page: string; detail: string }[];
}

const EVENT_COLORS: Record<string, string> = {
  search: "text-[var(--blue)]",
  pdf_upload: "text-[var(--accent)]",
  pdf_url_added: "text-[var(--accent)]",
  session_start: "text-[var(--green)]",
  export_csv: "text-[var(--green)]",
  client_error: "text-[var(--red)]",
  search_error: "text-[var(--red)]",
  pdf_load_error: "text-[var(--red)]",
};

export default function AdminCommandPage() {
  const { data, error, loading } = useAdminData<RealtimeData>(
    "/api/admin/stats?section=realtime",
    { refreshMs: 5000 }
  );

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  if (data && !data.configured) {
    return <ConfigNotice service="Telemetry database" envVars={["DATABASE_URL"]} docsAnchor="neon" />;
  }
  if (!data) return null;

  const errorRate = data.events1h ? data.errors1h / data.events1h : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="font-mono text-lg font-semibold text-[var(--text)]">Command Center</h1>
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--green)]">
          <Radio className="w-3 h-3 animate-scan" />
          Live · 5s refresh
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Active users" value={fmtNum(data.activeNow)} accent="green" sub="last 5 min" />
        <StatCard label="PDFs loaded" value={fmtNum(data.uploads1h)} accent="accent" sub="last hour" />
        <StatCard label="Searches" value={fmtNum(data.searches1h)} accent="blue" sub="last hour" />
        <StatCard
          label="Errors"
          value={fmtNum(data.errors1h)}
          accent={errorRate > 0.05 ? "red" : "green"}
          sub={`${(errorRate * 100).toFixed(1)}% of events`}
        />
      </div>

      <Panel title="Load — last 60 minutes">
        <TrendChart
          data={data.perMinute}
          xKey="minute"
          series={[
            { key: "pageviews", label: "Page views", color: "#4caf79" },
            { key: "uploads", label: "PDFs", color: "#f5c542" },
            { key: "searches", label: "Searches", color: "#5b9cf6" },
          ]}
          height={200}
        />
      </Panel>

      <Panel title="Live event feed">
        {data.feed.length === 0 ? (
          <p className="font-mono text-xs text-[var(--text-3)] py-4 text-center">
            Waiting for events…
          </p>
        ) : (
          <div className="space-y-0 max-h-96 overflow-y-auto">
            {data.feed.map((e, i) => (
              <div
                key={`${e.at}-${i}`}
                className="flex items-center gap-3 py-1.5 border-b border-[var(--border)] last:border-0 font-mono text-xs"
              >
                <span className="text-[var(--text-3)] shrink-0">{e.at}</span>
                <span className={`shrink-0 w-28 truncate ${EVENT_COLORS[e.event] ?? "text-[var(--text-2)]"}`}>
                  {e.event}
                </span>
                <span className="text-[var(--text-2)] truncate flex-1">{e.detail || e.page}</span>
                <span className="text-[var(--text-3)] shrink-0 hidden sm:inline">
                  {[e.country, e.device].filter(Boolean).join(" · ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
