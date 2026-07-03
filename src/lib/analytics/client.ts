/**
 * Client-side telemetry tracker.
 *
 * - Batches events in memory and flushes every few seconds (or on tab hide)
 *   via navigator.sendBeacon so it never blocks the UI or delays unload.
 * - Anonymous by design: reuses the existing pdfsearch_session cookie UUID
 *   as the anonymous ID; a per-tab session ID lives in sessionStorage.
 * - Respects Do Not Track / Global Privacy Control.
 * - Fails silently — analytics must never break the product.
 */

import { getOrCreateSessionId } from "@/lib/storage/userHistory";
import { MAX_QUERY_LEN, type EventName, type EventProps } from "./events";

const TAB_SESSION_KEY = "pdfsearch_tab_session";
const FLUSH_INTERVAL_MS = 4000;
const MAX_QUEUE = 25;

interface QueuedEvent {
  e: EventName;
  ts: number;
  props: EventProps;
}

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersBound = false;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function optedOut(): boolean {
  if (!isBrowser()) return true;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

function getTabSessionId(): string {
  try {
    let sid = sessionStorage.getItem(TAB_SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(TAB_SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "no-session-storage";
  }
}

function flush(useBeacon = false): void {
  if (!isBrowser() || queue.length === 0) return;
  const events = queue.splice(0, MAX_QUEUE);
  queue = [];

  const body = JSON.stringify({
    aid: getOrCreateSessionId(),
    sid: getTabSessionId(),
    page: location.pathname.slice(0, 256),
    ref: document.referrer.slice(0, 512) || undefined,
    events,
  });

  try {
    if (useBeacon && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Analytics must never surface errors to users.
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

function bindLifecycleListeners(): void {
  if (listenersBound || !isBrowser()) return;
  listenersBound = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
}

/** Queue a telemetry event. Safe to call anywhere, including SSR (no-op). */
export function track(event: EventName, props: EventProps = {}): void {
  if (!isBrowser() || optedOut()) return;
  bindLifecycleListeners();

  // Defensive truncation of any search query text.
  if (typeof props.q === "string") {
    props = { ...props, q: props.q.slice(0, MAX_QUERY_LEN) };
  }

  queue.push({ e: event, ts: Date.now(), props });
  if (queue.length >= MAX_QUEUE) flush();
  else scheduleFlush();
}

/** Fired once per tab session; safe to call repeatedly. */
export function trackSessionStart(): void {
  if (!isBrowser() || optedOut()) return;
  try {
    const KEY = "pdfsearch_session_started";
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
    track("session_start", {
      landing: location.pathname.slice(0, 256),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
      lang: navigator.language ?? "",
    });
  } catch {
    // sessionStorage unavailable (private mode) — skip dedupe, still track.
    track("session_start", { landing: location.pathname.slice(0, 256) });
  }
}
