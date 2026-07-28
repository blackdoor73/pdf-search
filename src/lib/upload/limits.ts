/**
 * Device-aware upload limits.
 *
 * PDFs are parsed in the visitor's browser, so the ceiling is their RAM,
 * not our server's. A flat 50MB cap is simultaneously too generous for a
 * budget phone and needlessly strict on a 32GB desktop.
 *
 * Capability signals (`navigator.deviceMemory`, `hardwareConcurrency`) are
 * Chromium-only. Safari and Firefox report nothing, so **unknown must fall
 * back to today's 50MB** — never to the high tier. Guessing high on an
 * unknown device is how you crash someone's tab.
 *
 * Pure and dependency-free so it is unit-testable under `node --test`.
 */

const MB = 1024 * 1024;

/** Constrained devices: phones, tablets, and anything reporting ≤2GB RAM. */
export const LIMIT_LOW = 25 * MB;
/** The safe default — also the value used whenever capability is unknown. */
export const LIMIT_DEFAULT = 50 * MB;
/** Capable desktops only. */
export const LIMIT_HIGH = 100 * MB;

/**
 * Absolute ceiling. Nothing above this is accepted regardless of device —
 * a single ArrayBuffer this large is already risky in any browser.
 */
export const LIMIT_CEILING = LIMIT_HIGH;

export interface DeviceCapability {
  /** navigator.deviceMemory — GB, Chromium-only, capped at 8 by the spec. */
  deviceMemory?: number;
  /** navigator.hardwareConcurrency — logical cores. */
  hardwareConcurrency?: number;
  /** Coarse mobile/tablet detection. */
  isMobile?: boolean;
}

/**
 * Resolve the per-file byte limit for this device.
 *
 * Note `deviceMemory` maxes out at 8 per spec (browsers deliberately cap it
 * to limit fingerprinting), so >=8 is the top bucket, not an exact reading.
 */
export function computeFileLimit(cap: DeviceCapability = {}): number {
  const { deviceMemory, hardwareConcurrency, isMobile } = cap;

  // Mobile first: a phone with 8GB is still a phone — thermally throttled,
  // aggressive tab eviction, and the OS reclaims memory far sooner.
  if (isMobile) return LIMIT_LOW;

  if (typeof deviceMemory === "number" && Number.isFinite(deviceMemory)) {
    if (deviceMemory <= 2) return LIMIT_LOW;
    if (deviceMemory >= 8 && (hardwareConcurrency ?? 0) >= 4) return LIMIT_HIGH;
    return LIMIT_DEFAULT;
  }

  // Capability unknown (Safari, Firefox, older browsers) — stay at today's
  // proven value.
  return LIMIT_DEFAULT;
}

/** Read capability from a browser. Returns {} during SSR. */
export function readDeviceCapability(): DeviceCapability {
  if (typeof navigator === "undefined") return {};
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    isMobile: /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(nav.userAgent ?? ""),
  };
}

/**
 * How many PDFs to parse concurrently.
 *
 * Peak memory is roughly `concurrency × average file size`, so a fixed
 * concurrency of 5 means five 50MB files in flight at once — which is what
 * actually crashes tabs, far more often than any single large file.
 */
export function computeConcurrency(
  totalBytes: number,
  fileCount: number
): number {
  if (fileCount <= 1) return 1;
  const avg = totalBytes / fileCount;
  if (avg > 25 * MB) return 2;
  if (avg > 10 * MB) return 3;
  return 5;
}

/** Human-readable size for user-facing messages. */
export function formatLimit(bytes: number): string {
  return `${Math.round(bytes / MB)}MB`;
}
