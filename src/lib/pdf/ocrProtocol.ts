/**
 * Message contract between the main thread and the OCR worker.
 *
 * Imported by both ends so the two can never drift. Types only plus a few
 * consts — no runtime deps, so importing this from the worker costs nothing.
 */

/** Where the self-hosted tesseract assets live (see scripts/copy-tesseract-assets.mjs). */
export const OCR_ASSETS = {
  workerPath: "/tesseract/worker.min.js",
  /** A DIRECTORY, deliberately: tesseract.js appends the core variant it picks
   *  from runtime WASM feature detection (relaxedsimd / simd / plain). Passing a
   *  filename here would pin every device to one build. */
  corePath: "/tesseract/",
  langPath: "/tesseract/lang",
  lang: "eng",
} as const;

// ─── Main thread → worker ─────────────────────────────────────────────────────

export interface OcrRunRequest {
  type: "run";
  jobId: string;
  /** PDF bytes, transferred. The worker opens its own pdf.js document. */
  buffer: ArrayBuffer;
  /** 1-based page numbers to OCR. Already capped by decideOcr(). */
  pages: number[];
}

export interface OcrCancelRequest {
  type: "cancel";
  jobId: string;
}

export type OcrRequest = OcrRunRequest | OcrCancelRequest;

// ─── Worker → main thread ─────────────────────────────────────────────────────

/** Sent once the engine is warm but before the first page is recognized. */
export interface OcrWarmingMessage {
  type: "warming";
  jobId: string;
}

/**
 * Per-page cost breakdown.
 *
 * The three stages are the only levers available: rasterizing with pdf.js,
 * encoding the bitmap, and tesseract recognition. Which of them dominates
 * decides whether pipelining or a cheaper codec is worth building at all — a
 * question that cannot be answered by reading the code.
 */
export interface OcrPageTimings {
  renderMs: number;
  encodeMs: number;
  recognizeMs: number;
  /** Encoded bytes handed to tesseract — the codec's real cost. */
  bytes: number;
}

/** One per OCR'd page, streamed so partial results survive a later failure. */
export interface OcrPageMessage {
  type: "page";
  jobId: string;
  pageNum: number;
  /** 1-based position within this job's page list. */
  index: number;
  total: number;
  lines: string[];
  /** Tesseract's mean confidence, 0-100. */
  confidence: number;
  timings?: OcrPageTimings;
}

export interface OcrDoneMessage {
  type: "done";
  jobId: string;
  pagesOcrd: number;
  /** Wall-clock ms for the whole job, including engine warm-up. */
  ms: number;
  /** Engine warm-up, paid once per cold engine and zero when already warm. */
  warmMs?: number;
}

export interface OcrErrorMessage {
  type: "error";
  jobId: string;
  message: string;
  /** Where it broke — distinguishes a bad asset from a bad page. */
  stage: "init" | "open" | "render" | "recognize";
  /** Page in flight when it broke, when applicable. */
  pageNum?: number;
}

export type OcrResponse =
  | OcrWarmingMessage
  | OcrPageMessage
  | OcrDoneMessage
  | OcrErrorMessage;

/** Result of one completed OCR job, assembled on the main thread. */
export interface OcrOutcome {
  /** Page number → recognized lines. Only pages that succeeded appear. */
  pageLines: Map<number, string[]>;
  pagesOcrd: number;
  ms: number;
  /** Mean confidence across recognized pages, or null if none. */
  confidence: number | null;
  /** Set when the job ended early; the pages above are still usable. */
  failed?: { message: string; stage: OcrErrorMessage["stage"] };
  /**
   * Time spent waiting for the OCR queue before any work began.
   *
   * Measured separately from `ms` because `ms` starts when execution starts, so
   * queue wait was invisible — which is why a batch of scanned files felt slow
   * without anything in telemetry showing it.
   */
  queueWaitMs: number;
  /** Summed per-stage cost across the pages this job read. */
  stageMs?: { render: number; encode: number; recognize: number; warm: number };
  /** Mean encoded bytes per page. */
  bytesPerPage?: number;
}
