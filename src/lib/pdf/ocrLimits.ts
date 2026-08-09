/**
 * OCR gating, thresholds, and the text-layer heuristic.
 *
 * Scanned (image-only) PDFs have no text layer, so `getTextContent()` returns
 * nothing and a search silently reports zero matches — indistinguishable from
 * "the word isn't in the document". This module decides when a PDF looks
 * scanned, whether OCR is worth attempting on this device, and how large a
 * bitmap to rasterize.
 *
 * Pure and dependency-free (except a type import) so it is unit-testable
 * under `node --test`. Same shape as src/lib/upload/limits.ts: exported
 * consts, classifiers returning union types, message builders.
 */

import type { DeviceCapability } from "@/lib/upload/limits";

// ─── Text-layer detection ─────────────────────────────────────────────────────

/**
 * Below this many non-whitespace characters, a page has no usable text layer.
 *
 * Scanner software often stamps a text layer containing only its own
 * artifacts: "Scanned by CamScanner" (20 non-ws), "Page 1 of 40" (9), a Bates
 * number "ABC-0001234" (11), a date stamp "03/14/2019" (10). All sit below 24.
 * The thinnest *legitimate* text page — a chapter divider reading
 * "Chapter Four — Consequences" — is 25.
 *
 * The two error costs are asymmetric, so bias high: a false "textless" wastes
 * ~1s of OCR and yields extra correct text, while a false "has text" means the
 * visitor silently gets zero results, which is the bug this exists to fix.
 */
export const PAGE_TEXT_CHAR_MIN = 24;

/**
 * Fraction of textless pages before the whole document reads as scanned.
 *
 * Pinned from both sides by real layouts: a born-digital 200-page report with
 * 30 scanned exhibits appended (15% textless) must NOT trigger a big OCR run
 * when the text layer already answers the query; a scanned court filing with a
 * 4-page digital cover + TOC and 36 scanned pages (90% textless) must. 0.6
 * sits in the wide gap, and beats 0.5 because 0.5 is a coin-flip boundary for
 * the very common "scanned document with digital cover page and appendix".
 */
export const SCANNED_PAGE_RATIO = 0.6;

/** Below this page count the ratio is too noisy, so judge all-or-nothing. */
export const RATIO_MIN_PAGES = 3;

export type TextLayerVerdict = "text" | "scanned" | "mixed";

export interface TextLayerStats {
  totalPages: number;
  textlessPages: number;
}

/** True when a page's text layer is absent or scanner-artifact-only. */
export function pageIsTextless(chars: number): boolean {
  return chars < PAGE_TEXT_CHAR_MIN;
}

/**
 * Classify a document's text layer.
 *
 * Note both "scanned" and "mixed" OCR *only the textless pages* — the verdict
 * never means "OCR pages 1..N". The distinction drives telemetry and UI copy
 * ("Reading scanned pages" reads wrong on a doc that is 85% text).
 */
export function classifyTextLayer(stats: TextLayerStats): TextLayerVerdict {
  const { totalPages, textlessPages } = stats;

  // Nothing to OCR. A doc that failed to parse errors elsewhere.
  if (totalPages <= 0) return "text";
  // Fast path — the overwhelming majority of PDFs.
  if (textlessPages <= 0) return "text";

  if (totalPages < RATIO_MIN_PAGES) {
    return textlessPages >= totalPages ? "scanned" : "mixed";
  }

  return textlessPages / totalPages >= SCANNED_PAGE_RATIO ? "scanned" : "mixed";
}

// ─── Rasterization ────────────────────────────────────────────────────────────

/** Target render DPI for OCR input. PDF user space is 72 DPI by definition. */
export const OCR_TARGET_DPI = 180;

/**
 * Never allocate a bitmap larger than this (~16MB as RGBA).
 *
 * Tesseract's accuracy curve is flat above ~300 DPI, but a US-Letter page at
 * 300 DPI is 2550x3300 = 33.7MB of RGBA plus tesseract's own copy. 180 DPI
 * lands within a point or two on 10-12pt body text at a third of the memory.
 *
 * The value must sit ABOVE a full-scale page of every common paper size, or the
 * budget silently binds on the common case and every page renders slightly
 * under target. At 2.5x: Letter 3.03M px, A4 3.13M px, **US Legal 3.86M px** —
 * and Legal matters, because scanned legal filings are a core case for OCR
 * here. 4M clears all three. A3 (6.3M) and larger are genuine large formats
 * where clamping is the right answer.
 */
export const OCR_MAX_PIXELS = 4_000_000;

/**
 * Render scale for a page of the given size in PDF points.
 *
 * The pixel budget is what saves large-format scans: an E-size sheet
 * (3370x2384pt) at the ideal 2.5x would allocate ~280MB, so it is clamped down.
 *
 * The floor of 1 deliberately WINS over the budget: below 1x the page renders
 * smaller than its own point size and OCR accuracy collapses, so we would burn
 * time for nothing. A sheet big enough to want less than 1x therefore still
 * exceeds OCR_MAX_PIXELS — the budget is a best effort, the floor is absolute.
 * Callers that must bound allocation should check the resulting dimensions.
 */
export function computeRenderScale(widthPt: number, heightPt: number): number {
  const ideal = OCR_TARGET_DPI / 72;
  const area = widthPt * heightPt;
  if (!Number.isFinite(area) || area <= 0) return ideal;
  const budget = Math.sqrt(OCR_MAX_PIXELS / area);
  return Math.max(1, Math.min(ideal, budget));
}

// ─── The OCR gate ─────────────────────────────────────────────────────────────

/** Hard cap on pages OCR'd per file. */
export const OCR_MAX_PAGES = 50;

/**
 * Cap across a whole search. The per-file cap is trivially defeated by a batch
 * of scanned files — five 50-page scans would be ~250 pages, several minutes.
 */
export const OCR_MAX_PAGES_PER_SEARCH = 100;

/**
 * At or below this page count, OCR runs silently under the normal spinner.
 *
 * Measured at ~1.5s/page warm (rasterize + recognize, single-threaded — no
 * COOP/COEP means no SharedArrayBuffer), plus a one-time ~4s asset download on
 * a cold cache. 5 pages is therefore ~8s warm, which is tolerable to leave
 * unexplained; much beyond that and a silent wait reads as a hang.
 */
export const OCR_SILENT_PAGE_MAX = 5;

/** Minimum reported RAM (GB) to attempt OCR. */
export const OCR_MIN_DEVICE_MEMORY = 4;

/** How long the warm tesseract engine lingers before being reclaimed. */
export const OCR_IDLE_TERMINATE_MS = 30_000;

export type OcrSkipReason =
  | "no-need"
  | "mobile"
  | "low-memory"
  | "unsupported"
  | "budget";

export type OcrDecision =
  | { run: false; reason: OcrSkipReason }
  | {
      run: true;
      /** 1-based page numbers to OCR, already capped. */
      pages: number[];
      /** How many textless pages were dropped by the cap. */
      truncated: number;
      /** True when no progress UI should be shown. */
      silent: boolean;
    };

/**
 * Decide whether to OCR, and which pages.
 *
 * `budgetLeft` is the search-wide page allowance still unspent; pass
 * OCR_MAX_PAGES_PER_SEARCH for a single-file decision.
 */
export function decideOcr(
  verdict: TextLayerVerdict,
  textlessPages: number[],
  cap: DeviceCapability = {},
  supported = true,
  budgetLeft = OCR_MAX_PAGES_PER_SEARCH
): OcrDecision {
  if (verdict === "text" || textlessPages.length === 0) {
    return { run: false, reason: "no-need" };
  }
  if (!supported) return { run: false, reason: "unsupported" };

  // A phone with 8GB is still a phone (see limits.ts). Tesseract holds ~50MB
  // plus a ~12MB canvas, on a device already capped to LIMIT_LOW files.
  if (cap.isMobile) return { run: false, reason: "mobile" };

  if (
    typeof cap.deviceMemory === "number" &&
    Number.isFinite(cap.deviceMemory) &&
    cap.deviceMemory < OCR_MIN_DEVICE_MEMORY
  ) {
    return { run: false, reason: "low-memory" };
  }

  // NOTE: unknown capability (Safari, Firefox) deliberately RUNS here, which
  // inverts computeFileLimit()'s conservative-on-unknown default. There,
  // guessing high risks killing a tab on a file the visitor cannot opt out of.
  // Here, guessing low would mean every Safari and Firefox user permanently
  // gets zero results on scanned PDFs — a Chrome-only feature, which defeats
  // the point. OCR is also incremental and abortable, unlike a 100MB buffer,
  // and mobile Safari/Firefox are still caught by the isMobile test above.

  if (budgetLeft <= 0) return { run: false, reason: "budget" };

  const allowance = Math.min(OCR_MAX_PAGES, budgetLeft);
  const pages = textlessPages.slice(0, allowance);
  return {
    run: true,
    pages,
    truncated: textlessPages.length - pages.length,
    silent: pages.length <= OCR_SILENT_PAGE_MAX,
  };
}

/** True when this browser can rasterize and run WASM off the main thread. */
export function ocrSupported(): boolean {
  return (
    typeof OffscreenCanvas !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    typeof Worker !== "undefined"
  );
}

// ─── Messages ─────────────────────────────────────────────────────────────────

/** Explains, in the empty state or a toast, why a scanned PDF wasn't read. */
export function ocrSkipMessage(reason: OcrSkipReason, filename: string): string {
  switch (reason) {
    case "mobile":
      return `${filename} is a scanned image with no text layer. Reading it needs OCR, which requires a desktop browser.`;
    case "low-memory":
      return `${filename} is a scanned image with no text layer. Reading it needs OCR, which requires more memory than this device reports.`;
    case "unsupported":
      return `${filename} is a scanned image with no text layer. Reading it needs OCR, which this browser doesn't support.`;
    case "budget":
      return `${filename} is a scanned image, but this search already reached its page limit for reading scanned pages.`;
    case "no-need":
    default:
      return `${filename} already has a text layer.`;
  }
}

/** Shown when a file had more scanned pages than the cap allows. */
export function ocrTruncatedNote(ocrd: number, total: number): string {
  const skipped = total - ocrd;
  return `Read the first ${ocrd} scanned page${ocrd === 1 ? "" : "s"} — ${skipped} more ${
    skipped === 1 ? "was" : "were"
  } skipped to keep this search responsive.`;
}
