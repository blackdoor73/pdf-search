"use client";

/**
 * Visitors — unique/returning visitor KPIs, a filterable paginated visitor
 * table (identity = anon id; ip_hash is the HMAC'd IP, never the raw IP),
 * and a per-visitor detail view (profile, event timeline, documents).
 */

import { useState } from "react";
import {
  ConfigNotice,
  DataTable,
  ErrorPanel,
  ExportButton,
  LoadingPanel,
  Pager,
  Panel,
  RangePicker,
  StatCard,
} from "@/components/admin/ui";
import { fmtBytes, fmtFlag, fmtNum, useAdminData } from "@/components/admin/useAdminData";

interface VisitorRow {
  anonId: string;
  ipHash: string;
  firstSeen: string;
  lastSeen: string;
  events: number;
  visits: number;
  country: string;
  region: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  lang: string;
  tz: string;
  referrer: string;
}

interface VisitorsData {
  configured: boolean;
  kpis: {
    uniqueVisitors: number;
    returningVisitors: number;
    totalVisits: number;
    avgVisitsPerVisitor: number;
  };
  rows: VisitorRow[];
  total: number;
  page: number;
  pageSize: number;
}

interface VisitorDetail {
  configured: boolean;
  profile: VisitorRow & { visits: number };
  events: { at: string; event: string; page: string; detail: string }[];
  documents: {
    id: number;
    at: string;
    filename: string;
    sizeBytes: number;
    pageCount: number;
    source: string;
    status: string;
  }[];
}

const DEVICES = ["", "desktop", "mobile", "tablet"];
const PAGE_SIZE = 25;

const inputClass =
  "bg-[var(--surface2)] border border-[var(--border)] px-2 py-1.5 font-mono text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]";

function VisitorDetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, error, loading } = useAdminData<VisitorDetail>(
    `/api/admin/stats?section=visitor&id=${encodeURIComponent(id)}`
  );
  return (
    <Panel
      title={`Visitor ${id.slice(0, 8)}…`}
      action={
        <button
          type="button"
          onClick={onClose}
          className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-3)] hover:text-[var(--red)]"
        >
          Close ✕
        </button>
      }
    >
      {loading && <LoadingPanel />}
      {error && <ErrorPanel message={error} />}
      {data?.profile && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 font-mono text-xs">
            {(
              [
                ["First seen", data.profile.firstSeen],
                ["Last seen", data.profile.lastSeen],
                ["Visits", String(data.profile.visits)],
                ["Events", String(data.profile.events)],
                [
                  "Location",
                  [data.profile.city, data.profile.region, data.profile.country]
                    .filter(Boolean)
                    .join(", ") || "—",
                ],
                ["System", `${data.profile.os} · ${data.profile.browser} · ${data.profile.device}`],
                ["Language / TZ", `${data.profile.lang || "—"} · ${data.profile.tz || "—"}`],
                ["IP hash", data.profile.ipHash ? `${data.profile.ipHash.slice(0, 12)}…` : "—"],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <div className="text-[10px] uppercase tracking-widest text-[var(--text-3)]">{label}</div>
                <div className="text-[var(--text)] mt-0.5 truncate" title={value}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {data.documents.length > 0 && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">
                Documents ({data.documents.length})
              </div>
              <DataTable
                headers={["Uploaded", "Filename", "Size", "Pages", "Source", "Status"]}
                align={["l", "l", "r", "r", "l", "l"]}
                rows={data.documents.map((d) => [
                  d.at,
                  d.filename,
                  fmtBytes(d.sizeBytes),
                  d.pageCount || "—",
                  d.source,
                  d.status,
                ])}
              />
            </div>
          )}

          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">
              Recent events ({data.events.length})
            </div>
            <DataTable
              headers={["Time", "Event", "Page", "Detail"]}
              rows={data.events.map((e) => [e.at, e.event, e.page, e.detail])}
            />
          </div>
        </div>
      )}
    </Panel>
  );
}

export default function AdminVisitorsPage() {
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [country, setCountry] = useState("");
  const [device, setDevice] = useState("");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const params = new URLSearchParams({
    section: "visitors",
    days: String(days),
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  if (country) params.set("country", country.toUpperCase());
  if (device) params.set("device", device);
  if (q) params.set("q", q);

  const { data, error, loading } = useAdminData<VisitorsData>(
    `/api/admin/stats?${params.toString()}`
  );

  if (data && !data.configured) {
    return <ConfigNotice service="Telemetry database" envVars={["DATABASE_URL"]} docsAnchor="neon" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-mono text-lg font-semibold text-[var(--text)]">Visitors</h1>
        <div className="flex items-center gap-4">
          <ExportButton report="visitors" days={days} />
          <RangePicker days={days} onChange={(d) => { setDays(d); setPage(1); }} />
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Unique visitors" value={fmtNum(data.kpis.uniqueVisitors)} accent="accent" sub={`${days} days`} />
          <StatCard label="Returning" value={fmtNum(data.kpis.returningVisitors)} accent="green" sub=">1 visit" />
          <StatCard label="Total visits" value={fmtNum(data.kpis.totalVisits)} />
          <StatCard
            label="Visits / visitor"
            value={data.kpis.avgVisitsPerVisitor ? data.kpis.avgVisitsPerVisitor.toFixed(1) : "—"}
          />
        </div>
      )}

      {selected && <VisitorDetailPanel id={selected} onClose={() => setSelected(null)} />}

      <Panel
        title="Visitor table"
        action={
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(qInput.trim());
              setPage(1);
            }}
          >
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="id / ip-hash prefix"
              className={`${inputClass} w-36`}
            />
            <input
              value={country}
              onChange={(e) => { setCountry(e.target.value.slice(0, 2)); setPage(1); }}
              placeholder="CC"
              title="Country code, e.g. US"
              className={`${inputClass} w-12 uppercase`}
            />
            <select
              value={device}
              onChange={(e) => { setDevice(e.target.value); setPage(1); }}
              className={inputClass}
            >
              {DEVICES.map((d) => (
                <option key={d} value={d}>
                  {d || "all devices"}
                </option>
              ))}
            </select>
          </form>
        }
      >
        {loading && <LoadingPanel />}
        {error && <ErrorPanel message={error} />}
        {data && !loading && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {["Visitor", "IP hash", "First seen", "Last seen", "Visits", "Events", "Location", "System", "Lang", "TZ"].map((h, i) => (
                      <th
                        key={h}
                        className={`font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] font-normal py-2 px-2 ${i === 4 || i === 5 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((v) => (
                    <tr
                      key={v.anonId}
                      onClick={() => setSelected(v.anonId)}
                      className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface2)] transition-colors"
                    >
                      <td className="font-mono text-xs py-2 px-2 text-[var(--accent)]">{v.anonId.slice(0, 8)}…</td>
                      <td className="font-mono text-xs py-2 px-2 text-[var(--text-2)]">{v.ipHash ? `${v.ipHash.slice(0, 10)}…` : "—"}</td>
                      <td className="font-mono text-xs py-2 px-2 text-[var(--text-2)]">{v.firstSeen}</td>
                      <td className="font-mono text-xs py-2 px-2 text-[var(--text-2)]">{v.lastSeen}</td>
                      <td className="font-mono text-xs py-2 px-2 text-right text-[var(--text)]">{v.visits}</td>
                      <td className="font-mono text-xs py-2 px-2 text-right text-[var(--text-2)]">{v.events}</td>
                      <td className="font-mono text-xs py-2 px-2 text-[var(--text-2)] max-w-[160px] truncate">
                        {fmtFlag(v.country)} {[v.city, v.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="font-mono text-xs py-2 px-2 text-[var(--text-2)] max-w-[160px] truncate">
                        {[v.os, v.browser, v.device].filter(Boolean).join(" · ")}
                      </td>
                      <td className="font-mono text-xs py-2 px-2 text-[var(--text-2)]">{v.lang || "—"}</td>
                      <td className="font-mono text-xs py-2 px-2 text-[var(--text-2)] max-w-[120px] truncate" title={v.tz}>{v.tz || "—"}</td>
                    </tr>
                  ))}
                  {data.rows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="font-mono text-xs text-[var(--text-3)] py-6 text-center">
                        No visitors match these filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
          </>
        )}
      </Panel>
    </div>
  );
}
