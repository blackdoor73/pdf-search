"use client";

/**
 * Shared admin dashboard primitives — stat cards, panels, tables, range
 * picker, alert banner, and config notices. Styled to match the site's
 * terminal-mono dark aesthetic.
 */

import { AlertTriangle, Download, Info, RefreshCw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Alert } from "@/lib/admin/queries";

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "accent" | "green" | "red" | "blue";
}) {
  const color =
    accent === "green"
      ? "text-[var(--green)]"
      : accent === "red"
      ? "text-[var(--red)]"
      : accent === "blue"
      ? "text-[var(--blue)]"
      : accent === "accent"
      ? "text-[var(--accent)]"
      : "text-[var(--text)]";
  return (
    <div className="card p-4">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">
        {label}
      </div>
      <div className={cn("font-mono text-2xl font-semibold", color)}>{value}</div>
      {sub && (
        <div className="font-mono text-[10px] text-[var(--text-3)] mt-1">{sub}</div>
      )}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card", className)}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
        <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-3)]">
          {title}
        </span>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function RangePicker({
  days,
  onChange,
  options = [7, 30, 90],
}: {
  days: number;
  onChange: (d: number) => void;
  options?: number[];
}) {
  return (
    <div className="flex border border-[var(--border)]">
      {options.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onChange(d)}
          className={cn(
            "px-3 py-1.5 font-mono text-[11px] transition-colors",
            days === d
              ? "bg-[var(--accent)] text-black font-semibold"
              : "text-[var(--text-3)] hover:text-[var(--text)]"
          )}
        >
          {d}d
        </button>
      ))}
    </div>
  );
}

export function ExportButton({ report, days }: { report: string; days: number }) {
  return (
    <span className="inline-flex items-center gap-3">
      {(["csv", "json"] as const).map((format) => (
        <a
          key={format}
          href={`/api/admin/export?report=${report}&days=${days}&format=${format}`}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] text-[var(--text-3)] hover:text-[var(--accent)] transition-colors uppercase tracking-wider"
          title={`Download ${format.toUpperCase()} (CSV opens in Excel)`}
        >
          <Download className="w-3 h-3" />
          {format}
        </a>
      ))}
    </span>
  );
}

export function Pager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3 font-mono text-[11px] text-[var(--text-3)]">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="px-3 py-1 border border-[var(--border)] disabled:opacity-40 hover:text-[var(--text)] transition-colors"
      >
        ← Prev
      </button>
      <span>
        Page {page} of {pages} · {total.toLocaleString()} rows
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="px-3 py-1 border border-[var(--border)] disabled:opacity-40 hover:text-[var(--text)] transition-colors"
      >
        Next →
      </button>
    </div>
  );
}

export function DataTable({
  headers,
  rows,
  align = [],
}: {
  headers: string[];
  rows: (string | number)[][];
  /** "r" to right-align a column. */
  align?: ("l" | "r")[];
}) {
  if (rows.length === 0) {
    return (
      <p className="font-mono text-xs text-[var(--text-3)] py-4 text-center">
        No data yet
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {headers.map((h, i) => (
              <th
                key={h}
                className={cn(
                  "font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] font-normal py-2 px-2",
                  align[i] === "r" ? "text-right" : "text-left"
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-[var(--border)] last:border-0">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "font-mono text-xs py-2 px-2 max-w-[280px] truncate",
                    ci === 0 ? "text-[var(--text)]" : "text-[var(--text-2)]",
                    align[ci] === "r" && "text-right"
                  )}
                  title={String(cell)}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AlertsBanner({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={cn(
            "flex items-start gap-3 px-4 py-3 border font-mono text-xs",
            a.severity === "critical"
              ? "border-[var(--red)] bg-red-500/8 text-[var(--red)]"
              : a.severity === "warning"
              ? "border-[var(--accent)] bg-yellow-500/8 text-[var(--accent)]"
              : "border-[var(--blue)] bg-blue-500/8 text-[var(--blue)]"
          )}
        >
          {a.severity === "critical" ? (
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : a.severity === "warning" ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-semibold uppercase tracking-wider">{a.title}</div>
            <div className="text-[var(--text-2)] mt-0.5">{a.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConfigNotice({
  service,
  envVars,
  docsAnchor,
}: {
  service: string;
  envVars: string[];
  docsAnchor?: string;
}) {
  return (
    <div className="card p-6 text-center space-y-3">
      <p className="font-mono text-sm text-[var(--text-2)]">
        {service} is not configured yet.
      </p>
      <p className="font-mono text-xs text-[var(--text-3)]">
        Set{" "}
        {envVars.map((v, i) => (
          <span key={v}>
            <code className="text-[var(--accent)]">{v}</code>
            {i < envVars.length - 1 ? ", " : ""}
          </span>
        ))}{" "}
        in your Vercel project environment.
      </p>
      <p className="font-mono text-[10px] text-[var(--text-3)]">
        Full setup guide: docs/ADMIN_DASHBOARD.md{docsAnchor ? `#${docsAnchor}` : ""}
      </p>
    </div>
  );
}

export function LoadingPanel() {
  return (
    <div className="flex items-center justify-center py-16 gap-2 font-mono text-xs text-[var(--text-3)]">
      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      Loading…
    </div>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="card p-6 text-center">
      <p className="font-mono text-xs text-[var(--red)]">{message}</p>
    </div>
  );
}
