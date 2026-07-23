"use client";

/**
 * Documents — analytics over uploaded-PDF *metadata* (no file bytes are
 * ever stored, so there is nothing to view/download; delete removes the
 * metadata rows). Insight cards, upload/size/processing charts, and a
 * filterable, paginated, deletable document table with duplicate detection.
 */

import { useCallback, useState } from "react";
import { BarsChart, TrendChart } from "@/components/admin/charts";
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
import { fmtBytes, fmtMs, fmtNum, useAdminData } from "@/components/admin/useAdminData";

interface DocInsights {
  configured: boolean;
  cards: {
    totalDocs: number;
    totalBytes: number;
    avgBytes: number;
    avgPages: number;
    medianPages: number;
    avgProcessingMs: number;
    errors: number;
    dupGroups: number;
  };
  daily: { date: string; uploads: number; bytes: number; avgProcessingMs: number }[];
  sizeHistogram: { label: string; docs: number }[];
  pageHistogram: { label: string; docs: number }[];
  largest: { filename: string; sizeBytes: number; pageCount: number; at: string }[];
  topFilenames: { filename: string; uploads: number }[];
  topProducers: { producer: string; docs: number }[];
}

interface DocRow {
  id: number;
  at: string;
  filename: string;
  sizeBytes: number;
  pageCount: number;
  sha256: string;
  title: string;
  author: string;
  producer: string;
  source: string;
  status: string;
  processingMs: number;
  country: string;
  city: string;
  duplicates: number;
}

interface DocsData {
  configured: boolean;
  rows: DocRow[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 25;
const inputClass =
  "bg-[var(--surface2)] border border-[var(--border)] px-2 py-1.5 font-mono text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]";

export default function AdminDocumentsPage() {
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [dupesOnly, setDupesOnly] = useState(false);
  const [source, setSource] = useState("");
  const [sort, setSort] = useState<"ts" | "size_bytes" | "page_count">("ts");
  const [minPages, setMinPages] = useState("");
  const [maxPages, setMaxPages] = useState("");
  const [minMb, setMinMb] = useState("");
  const [maxMb, setMaxMb] = useState("");
  const [version, setVersion] = useState(0); // bump to refetch after delete

  const { data: insights } = useAdminData<DocInsights>(
    `/api/admin/stats?section=docinsights&days=${days}`
  );

  const listParams = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    sort,
    dir: "desc",
    v: String(version),
  });
  if (q) listParams.set("q", q);
  if (dupesOnly) listParams.set("dupesOnly", "true");
  if (source) listParams.set("source", source);
  if (minPages) listParams.set("minPages", minPages);
  if (maxPages) listParams.set("maxPages", maxPages);
  if (minMb) listParams.set("minBytes", String(Math.round(Number(minMb) * 1048576)));
  if (maxMb) listParams.set("maxBytes", String(Math.round(Number(maxMb) * 1048576)));

  const { data, error, loading } = useAdminData<DocsData>(
    `/api/admin/documents?${listParams.toString()}`
  );

  const remove = useCallback(async (body: { ids?: number[]; sha256?: string }, label: string) => {
    if (!window.confirm(`Delete ${label}? This removes the metadata row(s) permanently.`)) return;
    const res = await fetch("/api/admin/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) setVersion((v) => v + 1);
    else window.alert("Delete failed");
  }, []);

  if (insights && !insights.configured) {
    return <ConfigNotice service="Telemetry database" envVars={["DATABASE_URL"]} docsAnchor="neon" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-mono text-lg font-semibold text-[var(--text)]">Documents</h1>
        <div className="flex items-center gap-4">
          <ExportButton report="documents" days={days} />
          <RangePicker days={days} onChange={setDays} />
        </div>
      </div>

      {insights?.cards && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Documents" value={fmtNum(insights.cards.totalDocs)} accent="accent" sub={`${days} days`} />
          <StatCard label="Bytes processed" value={fmtBytes(insights.cards.totalBytes)} sub="client-side only" />
          <StatCard label="Avg size" value={fmtBytes(insights.cards.avgBytes)} sub={`avg ${Math.round(insights.cards.avgPages) || "—"} pages`} />
          <StatCard label="Avg processing" value={fmtMs(insights.cards.avgProcessingMs)} accent="blue" sub={`${insights.cards.errors} errors`} />
          <StatCard label="Duplicate groups" value={fmtNum(insights.cards.dupGroups)} accent={insights.cards.dupGroups > 0 ? "red" : undefined} sub="same SHA-256" />
          <StatCard label="Median pages" value={insights.cards.medianPages ? String(Math.round(insights.cards.medianPages)) : "—"} />
        </div>
      )}

      {insights && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Panel title="Daily uploads">
            <TrendChart
              data={insights.daily}
              xKey="date"
              series={[{ key: "uploads", label: "Uploads" }]}
              height={200}
            />
          </Panel>
          <Panel title="Processing time trend">
            <TrendChart
              data={insights.daily}
              xKey="date"
              series={[{ key: "avgProcessingMs", label: "Avg ms" }]}
              height={200}
            />
          </Panel>
          <Panel title="File size distribution">
            <BarsChart
              data={insights.sizeHistogram}
              xKey="label"
              series={[{ key: "docs", label: "Documents" }]}
              height={200}
            />
          </Panel>
          <Panel title="Page count distribution">
            <BarsChart
              data={insights.pageHistogram}
              xKey="label"
              series={[{ key: "docs", label: "Documents" }]}
              height={200}
            />
          </Panel>
        </div>
      )}

      {insights && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Panel title="Largest documents">
            <DataTable
              headers={["Filename", "Size", "Pages"]}
              align={["l", "r", "r"]}
              rows={insights.largest.map((d) => [d.filename, fmtBytes(d.sizeBytes), d.pageCount || "—"])}
            />
          </Panel>
          <Panel title="Most frequent filenames">
            <DataTable
              headers={["Filename", "Uploads"]}
              align={["l", "r"]}
              rows={insights.topFilenames.map((d) => [d.filename, d.uploads])}
            />
          </Panel>
          <Panel title="Document types (producer)">
            <DataTable
              headers={["Producer", "Docs"]}
              align={["l", "r"]}
              rows={insights.topProducers.map((d) => [d.producer, d.docs])}
            />
          </Panel>
        </div>
      )}

      <Panel
        title={`Document table${data ? ` (${fmtNum(data.total)})` : ""}`}
        action={
          <form
            className="flex items-center gap-2 flex-wrap"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(qInput.trim());
              setPage(1);
            }}
          >
            <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="filename…" className={`${inputClass} w-32`} />
            <input value={minPages} onChange={(e) => { setMinPages(e.target.value.replace(/\D/g, "")); setPage(1); }} placeholder="min p" className={`${inputClass} w-14`} />
            <input value={maxPages} onChange={(e) => { setMaxPages(e.target.value.replace(/\D/g, "")); setPage(1); }} placeholder="max p" className={`${inputClass} w-14`} />
            <input value={minMb} onChange={(e) => { setMinMb(e.target.value.replace(/[^\d.]/g, "")); setPage(1); }} placeholder="min MB" className={`${inputClass} w-16`} />
            <input value={maxMb} onChange={(e) => { setMaxMb(e.target.value.replace(/[^\d.]/g, "")); setPage(1); }} placeholder="max MB" className={`${inputClass} w-16`} />
            <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className={inputClass}>
              <option value="">all sources</option>
              <option value="file">file</option>
              <option value="url">url</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className={inputClass}
            >
              <option value="ts">newest</option>
              <option value="size_bytes">largest</option>
              <option value="page_count">most pages</option>
            </select>
            <label className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-2)] cursor-pointer">
              <input
                type="checkbox"
                checked={dupesOnly}
                onChange={(e) => { setDupesOnly(e.target.checked); setPage(1); }}
                className="accent-[var(--accent)]"
              />
              dupes only
            </label>
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
                    {["Uploaded", "Filename", "Title / Author", "Size", "Pages", "Proc", "Source", "Geo", "Dup", ""].map((h, i) => (
                      <th
                        key={i}
                        className={`font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] font-normal py-2 px-2 ${i >= 3 && i <= 5 ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((d) => (
                    <tr key={d.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="font-mono text-xs py-2 px-2 text-[var(--text-2)] whitespace-nowrap">{d.at}</td>
                      <td className="font-mono text-xs py-2 px-2 text-[var(--text)] max-w-[200px] truncate" title={d.filename}>
                        {d.filename}
                        {d.status === "error" && <span className="text-[var(--red)] ml-1">!</span>}
                      </td>
                      <td className="font-mono text-xs py-2 px-2 text-[var(--text-2)] max-w-[200px] truncate" title={`${d.title} — ${d.author}`}>
                        {[d.title, d.author].filter(Boolean).join(" — ") || "—"}
                      </td>
                      <td className="font-mono text-xs py-2 px-2 text-right text-[var(--text-2)]">{fmtBytes(d.sizeBytes)}</td>
                      <td className="font-mono text-xs py-2 px-2 text-right text-[var(--text-2)]">{d.pageCount || "—"}</td>
                      <td className="font-mono text-xs py-2 px-2 text-right text-[var(--text-2)]">{fmtMs(d.processingMs)}</td>
                      <td className="font-mono text-xs py-2 px-2 text-[var(--text-2)]">{d.source}</td>
                      <td className="font-mono text-xs py-2 px-2 text-[var(--text-2)] max-w-[120px] truncate">
                        {[d.city, d.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="font-mono text-xs py-2 px-2">
                        {d.duplicates > 1 ? (
                          <button
                            type="button"
                            onClick={() => remove({ sha256: d.sha256 }, `all ${d.duplicates} copies of this document`)}
                            title="Delete all rows with this SHA-256"
                            className="text-[var(--accent)] hover:text-[var(--red)]"
                          >
                            ×{d.duplicates}
                          </button>
                        ) : (
                          <span className="text-[var(--text-3)]">—</span>
                        )}
                      </td>
                      <td className="font-mono text-xs py-2 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => remove({ ids: [d.id] }, `"${d.filename}"`)}
                          className="text-[var(--text-3)] hover:text-[var(--red)] transition-colors"
                          title="Delete metadata row"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {data.rows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="font-mono text-xs text-[var(--text-3)] py-6 text-center">
                        No documents match these filters
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
