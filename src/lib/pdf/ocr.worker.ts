/**
 * OCR worker — rasterizes PDF pages and recognizes text off the main thread.
 *
 * Why a worker of our own, when tesseract.js already spawns one: createWorker()
 * covers *recognition*, but rasterization does not — page.render() runs on
 * whatever thread calls it, at 200-600ms for a graphics-heavy scan. Fifty pages
 * of that on the main thread is 10-30s of frozen UI, which would leave the
 * Cancel button unable to even repaint. So both halves live here.
 *
 * The tesseract engine is created lazily on the first job and cached across
 * jobs (warm-up is ~1.5-3s, and a batch of scanned files should pay it once),
 * then released after an idle period.
 *
 * NOTE tsconfig has lib:["dom",...] without "webworker", so worker globals are
 * not typed in this project. The casts below are that, not sloppiness.
 */

import { createWorker, OEM, PSM, type Worker as TesseractWorker } from "tesseract.js";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import {
  OCR_ASSETS,
  type OcrRequest,
  type OcrResponse,
  type OcrErrorMessage,
} from "./ocrProtocol";
import { computeRenderScale, OCR_IDLE_TERMINATE_MS, OCR_TARGET_DPI } from "./ocrLimits";

const ctx = self as unknown as {
  postMessage: (m: OcrResponse) => void;
  onmessage: ((e: MessageEvent<OcrRequest>) => void) | null;
};

const post = (m: OcrResponse) => ctx.postMessage(m);

/** Jobs the main thread has asked us to abandon. */
const cancelled = new Set<string>();

// ─── Tesseract engine, lazily created and cached ──────────────────────────────

let enginePromise: Promise<TesseractWorker> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

async function getEngine(): Promise<TesseractWorker> {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (!enginePromise) {
    enginePromise = (async () => {
      const w = await createWorker(OCR_ASSETS.lang, OEM.LSTM_ONLY, {
        workerPath: OCR_ASSETS.workerPath,
        corePath: OCR_ASSETS.corePath,
        langPath: OCR_ASSETS.langPath,
        // Default true refetches the worker script and re-wraps it as a blob:
        // URL. CSP permits that, but it doubles the request and defeats caching.
        workerBlobURL: false,
        gzip: true,
      });
      await w.setParameters({
        tessedit_pageseg_mode: PSM.AUTO_OSD,
        // Tesseract cannot infer DPI from a bare bitmap; telling it suppresses
        // a warning and slightly improves layout analysis.
        user_defined_dpi: String(OCR_TARGET_DPI),
      });
      return w;
    })().catch((err) => {
      // Never cache a failed init — the next job should retry from scratch.
      enginePromise = null;
      throw err;
    });
  }
  return enginePromise;
}

function scheduleEngineRelease() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    const p = enginePromise;
    enginePromise = null;
    idleTimer = null;
    try {
      const w = await p;
      await w?.terminate();
    } catch {
      // Nothing to release.
    }
  }, OCR_IDLE_TERMINATE_MS);
}

// ─── pdf.js ───────────────────────────────────────────────────────────────────

async function getPdfjs() {
  const lib = await import("pdfjs-dist");
  lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return lib;
}

/**
 * Groups OCR words into lines by vertical position.
 *
 * Tesseract already returns newline-separated text, but it is one blob per
 * page; splitting on newlines gives us the same per-line shape the text-layer
 * path produces in engine.ts, so downstream search, highlighting and context
 * display behave identically for OCR'd and embedded text.
 */
function toLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s{2,}/g, " ").trim())
    .filter((l) => l.length > 0);
}

// ─── Job runner ───────────────────────────────────────────────────────────────

async function run(jobId: string, buffer: ArrayBuffer, pages: number[]) {
  const started = Date.now();
  let pagesOcrd = 0;
  let warmMs = 0;

  const fail = (
    message: string,
    stage: OcrErrorMessage["stage"],
    pageNum?: number
  ) => post({ type: "error", jobId, message, stage, pageNum });

  // One canvas for the whole job, resized per page: resizing reallocates the
  // backing store anyway, and this avoids leaving 50 wrappers pending GC.
  let canvas: OffscreenCanvas | null = null;

  let pdf: PDFDocumentProxy | null = null;

  try {
    let engine: TesseractWorker;
    try {
      // Zero when the engine is already warm — which is the point of caching it
      // across jobs, and worth being able to confirm from the numbers.
      const warmStart = performance.now();
      engine = await getEngine();
      warmMs = Math.round(performance.now() - warmStart);
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err), "init");
      return;
    }
    if (cancelled.has(jobId)) return;
    post({ type: "warming", jobId });

    const pdfjs = await getPdfjs();
    try {
      pdf = await pdfjs.getDocument({ data: buffer }).promise;
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err), "open");
      return;
    }

    for (let i = 0; i < pages.length; i++) {
      // Cancellation is checked between pages — worst case one page of latency
      // (~1.5s), which is simple and good enough for a Cancel button.
      if (cancelled.has(jobId)) return;

      const pageNum = pages[i];
      let page: PDFPageProxy | null = null;
      try {
        page = await pdf.getPage(pageNum);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({
          scale: computeRenderScale(base.width, base.height),
        });

        const w = Math.ceil(viewport.width);
        const h = Math.ceil(viewport.height);
        if (!canvas) canvas = new OffscreenCanvas(w, h);
        else {
          canvas.width = w;
          canvas.height = h;
        }

        const c2d = canvas.getContext("2d", { alpha: false });
        if (!c2d) throw new Error("2d context unavailable");
        // Load-bearing: pdf.js composites onto a transparent canvas, and
        // tesseract reads alpha=0 as black — the single most common cause of
        // "OCR returned an empty string".
        c2d.fillStyle = "#ffffff";
        c2d.fillRect(0, 0, w, h);

        const renderStart = performance.now();
        const task = page.render({
          canvasContext: c2d as unknown as CanvasRenderingContext2D,
          viewport,
          // Keep review stamps and form-field chrome out of the OCR input.
          annotationMode: 0,
        });
        try {
          await task.promise;
        } finally {
          task.cancel();
        }
        const renderMs = performance.now() - renderStart;

        const encodeStart = performance.now();
        const blob = await canvas.convertToBlob({ type: "image/png" });
        const encodeMs = performance.now() - encodeStart;
        if (cancelled.has(jobId)) return;

        const recognizeStart = performance.now();
        const { data } = await engine.recognize(blob);
        const recognizeMs = performance.now() - recognizeStart;

        pagesOcrd++;
        post({
          type: "page",
          jobId,
          pageNum,
          index: i + 1,
          total: pages.length,
          lines: toLines(data.text ?? ""),
          confidence: typeof data.confidence === "number" ? data.confidence : 0,
          timings: {
            renderMs: Math.round(renderMs),
            encodeMs: Math.round(encodeMs),
            recognizeMs: Math.round(recognizeMs),
            bytes: blob.size,
          },
        });
      } catch (err) {
        // Report and stop, but keep every page already streamed: a failure on
        // page 37 must not discard 36 good pages.
        fail(
          err instanceof Error ? err.message : String(err),
          "recognize",
          pageNum
        );
        return;
      } finally {
        // Frees pdf.js's per-page operator list and font caches. Without this a
        // 50-page run climbs steadily.
        page?.cleanup();
      }
    }

    post({ type: "done", jobId, pagesOcrd, ms: Date.now() - started, warmMs });
  } finally {
    if (canvas) {
      // Detach the backing store now rather than waiting for GC.
      canvas.width = 0;
      canvas.height = 0;
    }
    await pdf?.destroy().catch(() => {});
    cancelled.delete(jobId);
    scheduleEngineRelease();
  }
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

ctx.onmessage = (e: MessageEvent<OcrRequest>) => {
  const msg = e.data;
  if (msg.type === "cancel") {
    cancelled.add(msg.jobId);
    return;
  }
  if (msg.type === "run") {
    void run(msg.jobId, msg.buffer, msg.pages);
  }
};
