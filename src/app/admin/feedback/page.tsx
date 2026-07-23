"use client";

/**
 * Admin feedback inbox — filter by category/status, search messages,
 * resolve/reopen, delete, reply (mailto when the user left an email), and
 * export CSV/JSON.
 */

import { useCallback, useState } from "react";
import {
  ConfigNotice,
  ErrorPanel,
  ExportButton,
  LoadingPanel,
  Pager,
  Panel,
  StatCard,
} from "@/components/admin/ui";
import { fmtNum, useAdminData } from "@/components/admin/useAdminData";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
} from "@/lib/feedback/schema";

interface FeedbackRow {
  id: number;
  at: string;
  category: string;
  message: string;
  email: string;
  page: string;
  country: string;
  browser: string;
  os: string;
  device: string;
  status: string;
  adminNote: string;
}

interface FeedbackData {
  configured: boolean;
  rows: FeedbackRow[];
  total: number;
  newCount: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 25;
const inputClass =
  "bg-[var(--surface2)] border border-[var(--border)] px-2 py-1.5 font-mono text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]";

export default function AdminFeedbackPage() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [version, setVersion] = useState(0);

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    v: String(version),
  });
  if (category) params.set("category", category);
  if (status) params.set("status", status);
  if (q) params.set("q", q);

  const { data, error, loading } = useAdminData<FeedbackData>(
    `/api/admin/feedback?${params.toString()}`
  );

  const act = useCallback(
    async (method: "PATCH" | "DELETE", body: object) => {
      const res = await fetch("/api/admin/feedback", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) setVersion((v) => v + 1);
      else window.alert("Action failed");
    },
    []
  );

  if (data && !data.configured) {
    return <ConfigNotice service="Telemetry database" envVars={["DATABASE_URL"]} docsAnchor="neon" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="font-mono text-lg font-semibold text-[var(--text)]">Feedback</h1>
        <ExportButton report="feedback" days={365} />
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Total feedback" value={fmtNum(data.total)} accent="accent" />
          <StatCard label="Unresolved" value={fmtNum(data.newCount)} accent={data.newCount > 0 ? "red" : "green"} />
          <StatCard label="On this page" value={fmtNum(data.rows.length)} />
        </div>
      )}

      <Panel
        title="Inbox"
        action={
          <form
            className="flex items-center gap-2 flex-wrap"
            onSubmit={(e) => {
              e.preventDefault();
              setQ(qInput.trim());
              setPage(1);
            }}
          >
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="search messages…"
              className={`${inputClass} w-40`}
            />
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className={inputClass}
            >
              <option value="">all categories</option>
              {FEEDBACK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {FEEDBACK_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className={inputClass}
            >
              <option value="">all statuses</option>
              <option value="new">new</option>
              <option value="resolved">resolved</option>
            </select>
          </form>
        }
      >
        {loading && <LoadingPanel />}
        {error && <ErrorPanel message={error} />}
        {data && !loading && (
          <>
            <div className="space-y-3">
              {data.rows.map((f) => (
                <div
                  key={f.id}
                  className={`border p-3 ${f.status === "resolved" ? "border-[var(--border)] opacity-70" : "border-[var(--accent)]/30"}`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] bg-[var(--surface2)] border border-[var(--border)] px-1.5 py-0.5">
                        {FEEDBACK_CATEGORY_LABELS[f.category as keyof typeof FEEDBACK_CATEGORY_LABELS] ?? f.category}
                      </span>
                      {f.status === "resolved" && (
                        <span className="font-mono text-[10px] text-[var(--green)]">resolved</span>
                      )}
                      <span className="font-mono text-[10px] text-[var(--text-3)]">{f.at}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          act("PATCH", { id: f.id, status: f.status === "resolved" ? "new" : "resolved" })
                        }
                        className="font-mono text-[10px] text-[var(--text-3)] hover:text-[var(--green)]"
                      >
                        {f.status === "resolved" ? "Reopen" : "Resolve"}
                      </button>
                      {f.email && (
                        <a
                          href={`mailto:${f.email}?subject=${encodeURIComponent("Re: your PDFSearch feedback")}`}
                          className="font-mono text-[10px] text-[var(--text-3)] hover:text-[var(--accent)]"
                        >
                          Reply
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Delete this feedback permanently?")) act("DELETE", { ids: [f.id] });
                        }}
                        className="font-mono text-[10px] text-[var(--text-3)] hover:text-[var(--red)]"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="font-sans text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">
                    {f.message}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap mt-2 font-mono text-[10px] text-[var(--text-3)]">
                    {f.email && <span className="text-[var(--text-2)]">{f.email}</span>}
                    {f.page && <span>{f.page}</span>}
                    {(f.device || f.os || f.browser) && (
                      <span>{[f.device, f.os, f.browser].filter(Boolean).join(" · ")}</span>
                    )}
                    {f.country && <span>{f.country}</span>}
                  </div>
                </div>
              ))}
              {data.rows.length === 0 && (
                <p className="font-mono text-xs text-[var(--text-3)] py-6 text-center">
                  No feedback matches these filters
                </p>
              )}
            </div>
            <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />
          </>
        )}
      </Panel>
    </div>
  );
}
