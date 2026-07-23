/**
 * Client-side telemetry tracker.
 *
 * - Batches events in memory and flushes every few seconds (or on tab
 *   hide) via navigator.sendBeacon — never blocks the UI, never delays
 *   PDF processing or search.
 * - Identity comes from src/lib/analytics/identity.ts: one anonymous id
 *   per browser, one 30-min-inactivity session shared across tabs.
 * - Every event carries a client-generated UUID; the server inserts with
 *   ON CONFLICT DO NOTHING, so beacon/fetch retries can never
 *   double-count.
 * - Skips known automation (navigator.webdriver) and honors DNT/GPC.
 * - Fails silently — analytics must never break the product.
 */

import { getIdentity } from "./identity";
import { MAX_QUERY_LEN, type EventName, type EventProps } from "./events";

const FLUSH_INTERVAL_MS = 4000;
const MAX_QUEUE = 25;

interface QueuedEvent {
  id: string;
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
  // webdriver: Puppeteer/Selenium/etc. — automation isn't a user.
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true || nav.webdriver === true;
}

function sessionStartProps(): EventProps {
  const props: EventProps = {
    landing: location.pathname.slice(0, 256),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    lang: navigator.language ?? "",
  };
  // First-party acquisition attribution.
  try {
    const params = new URLSearchParams(location.search);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      const v = params.get(key);
      if (v) props[key] = v.slice(0, 100);
    }
  } catch {
    // Malformed query string — attribution is best-effort.
  }
  return props;
}

function flush(useBeacon = false): void {
  if (!isBrowser() || queue.length === 0) return;
  const events = queue.splice(0, MAX_QUEUE);
  queue = [];

  const ident = getIdentity();
  const body = JSON.stringify({
    aid: ident.aid,
    sid: ident.sid,
    page: location.pathname.slice(0, 256),
    ref: document.referrer.slice(0, 512) || undefined,
    tz: (Intl.DateTimeFormat().resolvedOptions().timeZone ?? "").slice(0, 64) || undefined,
    lang: (navigator.language ?? "").slice(0, 32) || undefined,
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

  // Session detection happens at event time: if this event opens a new
  // session, record session_start first so ordering is always correct.
  const ident = getIdentity();
  if (ident.sessionIsNew) {
    queue.push({
      id: crypto.randomUUID(),
      e: "session_start",
      ts: Date.now(),
      props: sessionStartProps(),
    });
  }

  // Defensive truncation of any search query text.
  if (typeof props.q === "string") {
    props = { ...props, q: props.q.slice(0, MAX_QUERY_LEN) };
  }

  queue.push({ id: crypto.randomUUID(), e: event, ts: Date.now(), props });
  if (queue.length >= MAX_QUEUE) flush();
  else scheduleFlush();
}
