/**
 * Main-thread handle on the OCR worker.
 *
 * Owns the worker's lifecycle, serializes jobs through ocrQueue (see the note
 * there on why OCR must not run in parallel with itself), and enforces the
 * search-wide page budget that the per-file cap alone cannot.
 *
 * Nothing here is imported unless a scanned PDF is actually found — the worker
 * chunk and the ~15MB of tesseract assets stay unfetched for everyone else.
 */

import {
  type OcrOutcome,
  type OcrRequest,
  type OcrResponse,
} from "./ocrProtocol";
import { enqueueOcr } from "./ocrQueue";
import { computeOcrPoolSize } from "./ocrLimits";
import { readDeviceCapability } from "@/lib/upload/limits";

export interface OcrJobProgress {
  pagesDone: number;
  pagesTotal: number;
  phase: "warming" | "reading";
}

export interface OcrJobOptions {
  /** PDF bytes. Transferred to the worker — do not use them afterwards. */
  buffer: ArrayBuffer;
  /** 1-based page numbers, already capped by decideOcr(). */
  pages: number[];
  onProgress?: (p: OcrJobProgress) => void;
  signal?: AbortSignal;
}

let worker: Worker | null = null;
let jobCounter = 0;

/**
 * Global marker for "an OCR worker exists".
 *
 * Teardown paths (clearFiles, cancelSearch) need to release the worker, but
 * must not `import()` this module to find out whether there is one — that would
 * fetch the OCR chunk for the vast majority of visitors who never open a
 * scanned PDF. A flag on globalThis is readable without importing anything.
 * See ocrWorkerExists() in ./ocrTeardown.
 */
const LIVE_FLAG = "__pdfsearchOcrLive";

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./ocr.worker.ts", import.meta.url), {
      type: "module",
    });
    (globalThis as Record<string, unknown>)[LIVE_FLAG] = true;
  }
  return worker;
}

/**
 * Tears the worker down, releasing the tesseract engine's ~50MB with it.
 *
 * Terminating the outer worker does not reliably reclaim a nested worker's WASM
 * heap in every engine, so the worker also terminates tesseract on its own idle
 * timer; this is the immediate path for a user-initiated cancel.
 */
export function disposeOcr(): void {
  worker?.terminate();
  worker = null;
  (globalThis as Record<string, unknown>)[LIVE_FLAG] = false;
}

/**
 * Runs one OCR job, serialized against every other job.
 *
 * Never rejects for OCR-specific failures: a partial or failed run returns
 * whatever pages succeeded plus a `failed` marker, because OCR is strictly
 * additive to the text-layer result and must not fail the file.
 */
export function runOcrJob(opts: OcrJobOptions): Promise<OcrOutcome> {
  // Timed HERE, before the queue, not inside execute(): everything OCR reported
  // until now started its clock after the queue released it, so time spent
  // waiting behind another file was invisible in telemetry.
  const enqueuedAt = performance.now();
  return enqueueOcr(async () => {
    const queueWaitMs = Math.round(performance.now() - enqueuedAt);
    const outcome = await execute(opts);
    return { ...outcome, queueWaitMs };
  });
}

function execute({
  buffer,
  pages,
  onProgress,
  signal,
}: OcrJobOptions): Promise<OcrOutcome> {
  const jobId = `ocr-${++jobCounter}`;
  const pageLines = new Map<number, string[]>();
  const confidences: number[] = [];
  const started = Date.now();
  const stage = { render: 0, encode: 0, recognize: 0, warm: 0 };
  let totalBytes = 0;
  let timedPages = 0;
  let peakRecognizing = 0;
  let poolWorkers = 0;

  return new Promise<OcrOutcome>((resolve) => {
    const w = getWorker();

    const summary = (failed?: OcrOutcome["failed"]): OcrOutcome => ({
      pageLines,
      pagesOcrd: pageLines.size,
      ms: Date.now() - started,
      confidence: confidences.length
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : null,
      failed,
      // Overwritten by runOcrJob, which owns the pre-queue timestamp.
      queueWaitMs: 0,
      stageMs: timedPages > 0 ? { ...stage } : undefined,
      bytesPerPage:
        timedPages > 0 ? Math.round(totalBytes / timedPages) : undefined,
      peakRecognizing,
      poolWorkers,
    });

    const cleanup = () => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };

    const finish = (failed?: OcrOutcome["failed"]) => {
      cleanup();
      resolve(summary(failed));
    };

    function onMessage(e: MessageEvent<OcrResponse>) {
      const m = e.data;
      if (m.jobId !== jobId) return; // not ours

      switch (m.type) {
        case "warming":
          onProgress?.({ pagesDone: 0, pagesTotal: pages.length, phase: "warming" });
          break;
        case "page":
          pageLines.set(m.pageNum, m.lines);
          confidences.push(m.confidence);
          if (m.timings) {
            stage.render += m.timings.renderMs;
            stage.encode += m.timings.encodeMs;
            stage.recognize += m.timings.recognizeMs;
            totalBytes += m.timings.bytes;
            timedPages++;
          }
          onProgress?.({
            pagesDone: m.index,
            pagesTotal: m.total,
            phase: "reading",
          });
          break;
        case "done":
          stage.warm = m.warmMs ?? 0;
          peakRecognizing = m.peakRecognizing ?? 0;
          poolWorkers = m.poolWorkers ?? 0;
          finish();
          break;
        case "error":
          finish({ message: m.message, stage: m.stage });
          break;
      }
    }

    function onError(e: ErrorEvent) {
      // The worker itself broke (bad chunk, thrown at top level).
      finish({ message: e.message || "OCR worker failed", stage: "init" });
    }

    function onAbort() {
      const msg: OcrRequest = { type: "cancel", jobId };
      w.postMessage(msg);
      // Resolve immediately with partial pages rather than waiting for the
      // worker to notice — it only checks between pages.
      finish({ message: "cancelled", stage: "recognize" });
    }

    if (signal?.aborted) {
      finish({ message: "cancelled", stage: "recognize" });
      return;
    }

    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort, { once: true });

    const req: OcrRequest = {
      type: "run",
      jobId,
      buffer,
      pages,
      // Decided here because computeOcrPoolSize reads navigator, which the
      // worker scope does not expose.
      poolSize: computeOcrPoolSize(readDeviceCapability()),
    };
    w.postMessage(req, [buffer]);
  });
}
