"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Options {
  /** Poll interval in ms (e.g. Command Center realtime). */
  refreshMs?: number;
}

/**
 * Minimal fetch hook for admin API endpoints. Redirects to login on 401
 * (expired session), supports polling, and aborts in-flight requests on
 * URL change/unmount.
 */
export function useAdminData<T>(url: string | null, { refreshMs }: Options = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (background = false) => {
      if (!url) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      if (!background) setLoading(true);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (res.status === 401) {
          window.location.href = `/admin/login?next=${encodeURIComponent(location.pathname)}`;
          return;
        }
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
        setData(json as T);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        if (!background) setLoading(false);
      }
    },
    [url]
  );

  useEffect(() => {
    setData(null);
    setError(null);
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  useEffect(() => {
    if (!refreshMs || !url) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, url, load]);

  return { data, error, loading, reload: load };
}

// ─── Formatting helpers shared across admin pages ─────────────────────────────

export function fmtNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

export function fmtBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

export function fmtMs(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms) || ms === 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function fmtPct(ratio: number | null | undefined): string {
  if (ratio == null || Number.isNaN(ratio)) return "—";
  return `${(ratio * 100).toFixed(1)}%`;
}

/** ISO-3166 alpha-2 country code → flag emoji (e.g. "US" → 🇺🇸). */
export function fmtFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))
  );
}
