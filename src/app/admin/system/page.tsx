"use client";

/**
 * System health — honest operational metrics for a client-side app on
 * serverless: error rates, client-measured latency, Core Web Vitals,
 * telemetry ingestion health, and storage usage. (There are no queues or
 * workers in this architecture — processing happens in users' browsers.)
 */

import { CheckCircle2, XCircle } from "lucide-react";
import {
  ConfigNotice,
  DataTable,
  ErrorPanel,
  LoadingPanel,
  Panel,
  StatCard,
} from "@/components/admin/ui";
import { fmtBytes, fmtMs, fmtNum, useAdminData } from "@/components/admin/useAdminData";

interface SystemData {
  configured: boolean;
  searches24h: number;
  searchErrors24h: number;
  loadErrors24h: number;
  uploads24h: number;
  clientErrors24h: number;
  events24h: number;
  lastEventAt: string | null;
  searchLatency: { p50: number; p95: number; p99: number };
  webVitals: { name: string; p75: number; samples: number }[];
  errorCodes: { code: string; count: number }[];
  storage: { dbBytes: number; eventsBytes: number; eventCount: number };
  recentErrors: { at: string; event: string; detail: string; page: string }[];
}

const VITAL_BUDGETS: Record<string, { good: number; unit: "ms" | "score" }> = {
  LCP: { good: 2500, unit: "ms" },
  INP: { good: 200, unit: "ms" },
  CLS: { good: 0.1, unit: "score" },
  TTFB: { good: 800, unit: "ms" },
  FCP: { good: 1800, unit: "ms" },
};

interface VisitorsData {
  configured: boolean;
  visitors: {
    visitor: string;
    firstSeen: string;
    lastSeen: string;
    events: number;
    sessions: number;
    device: string;
    browser: string;
    country: string;
  }[];
}

/** Ground truth for identity counting — one row per anon_id, straight from
 *  the events table, so dashboard numbers can be verified against raw data. */
function RecentVisitorsPanel() {
  const { data } = useAdminData<VisitorsData>("/api/admin/stats?section=visitors");
  if (!data?.configured) return null;
  return (
    <Panel title="Recent visitors (raw anon_ids — identity ground truth)">
      <DataTable
        headers={["Visitor", "First seen", "Last seen", "Events", "Sessions", "Device", "Browser", "Geo"]}
        align={["l", "l", "l", "r", "r", "l", "l", "l"]}
        rows={(data.visitors ?? []).map((v) => [
          `${v.visitor}…`,
          v.firstSeen,
          v.lastSeen,
          v.events,
          v.sessions,
          v.device,
          v.browser,
          v.country,
        ])}
      />
    </Panel>
  );
}

function HealthRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)]" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-[var(--red)]" />
        )}
        <span className="font-mono text-xs text-[var(--text)]">{label}</span>
      </div>
      <span className="font-mono text-[10px] text-[var(--text-3)]">{detail}</span>
    </div>
  );
}

export default function AdminSystemPage() {
  const { data, error, loading } = useAdminData<SystemData>(
    "/api/admin/stats?section=system",
    { refreshMs: 60_000 }
  );

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  if (data && !data.configured) {
    return <ConfigNotice service="Telemetry database" envVars={["DATABASE_URL"]} docsAnchor="neon" />;
  }
  if (!data) return null;

  const searchErrRate = data.searches24h
    ? data.searchErrors24h / (data.searches24h + data.searchErrors24h)
    : 0;
  const uploadFailRate =
    data.uploads24h + data.loadErrors24h > 0
      ? data.loadErrors24h / (data.uploads24h + data.loadErrors24h)
      : 0;
  const ingestFresh = data.lastEventAt
    ? Date.now() - new Date(data.lastEventAt).getTime() < 30 * 60_000
    : false;

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-lg font-semibold text-[var(--text)]">System</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Upload failure rate"
          value={`${(uploadFailRate * 100).toFixed(1)}%`}
          accent={uploadFailRate > 0.1 ? "red" : "green"}
          sub={`${data.loadErrors24h} failures / 24h`}
        />
        <StatCard
          label="Search error rate"
          value={`${(searchErrRate * 100).toFixed(1)}%`}
          accent={searchErrRate > 0.05 ? "red" : "green"}
          sub={`${data.searchErrors24h} errors / 24h`}
        />
        <StatCard label="Client errors 24h" value={fmtNum(data.clientErrors24h)} accent={data.clientErrors24h > 20 ? "red" : undefined} />
        <StatCard label="Events 24h" value={fmtNum(data.events24h)} sub="telemetry volume" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Search p50" value={fmtMs(data.searchLatency.p50)} sub="in-browser, 7d" />
        <StatCard label="Search p95" value={fmtMs(data.searchLatency.p95)} />
        <StatCard label="Search p99" value={fmtMs(data.searchLatency.p99)} />
        <StatCard
          label="Storage"
          value={fmtBytes(data.storage.dbBytes)}
          sub={`${fmtNum(data.storage.eventCount)} events · 512 MB free tier`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="Health checks">
          <HealthRow
            label="Telemetry ingestion"
            ok={ingestFresh || data.events24h === 0}
            detail={data.lastEventAt ? `last event ${data.lastEventAt}` : "no events yet"}
          />
          <HealthRow label="Database" ok={true} detail="Neon Postgres reachable" />
          <HealthRow
            label="Upload pipeline"
            ok={uploadFailRate <= 0.1}
            detail={`${fmtNum(data.uploads24h)} PDFs loaded / 24h`}
          />
          <HealthRow
            label="Search engine (client-side)"
            ok={searchErrRate <= 0.05}
            detail={`${fmtNum(data.searches24h)} searches / 24h`}
          />
        </Panel>

        <Panel title="Core Web Vitals (p75, 7d)">
          {data.webVitals.length === 0 ? (
            <p className="font-mono text-xs text-[var(--text-3)] py-4 text-center">No samples yet</p>
          ) : (
            <div>
              {data.webVitals.map((v) => {
                const budget = VITAL_BUDGETS[v.name];
                const good = budget ? v.p75 <= budget.good : true;
                return (
                  <div
                    key={v.name}
                    className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0"
                  >
                    <span className="font-mono text-xs text-[var(--text)]">{v.name}</span>
                    <span className="font-mono text-xs">
                      <span className={good ? "text-[var(--green)]" : "text-[var(--red)]"}>
                        {budget?.unit === "score" ? v.p75.toFixed(3) : fmtMs(v.p75)}
                      </span>
                      <span className="text-[var(--text-3)] ml-2">({v.samples} samples)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Panel title="PDF load failures by cause (7d)">
          <DataTable
            headers={["Error code", "Count"]}
            align={["l", "r"]}
            rows={data.errorCodes.map((e) => [e.code, e.count])}
          />
        </Panel>
        <Panel title="Recent errors">
          <DataTable
            headers={["Time", "Type", "Detail"]}
            rows={data.recentErrors.map((e) => [e.at, e.event, e.detail || e.page])}
          />
        </Panel>
      </div>

      <RecentVisitorsPanel />

      <p className="font-mono text-[10px] text-[var(--text-3)] leading-relaxed">
        Note: PDFSearch processes PDFs entirely in users&apos; browsers — there are no
        server queues or workers to monitor. Latency here is real user-measured
        processing time; server-side function health is visible in the Vercel dashboard.
      </p>
    </div>
  );
}
