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

import {
  createScheduler,
  createWorker,
  OEM,
  PSM,
  type Scheduler,
  type Worker as TesseractWorker,
} from "tesseract.js";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import {
  OCR_ASSETS,
  type OcrRequest,
  type OcrResponse,
  type OcrErrorMessage,
} from "./ocrProtocol";
import {
  computeRenderScale,
  OCR_IDLE_TERMINATE_MS,
  OCR_TARGET_DPI,
} from "./ocrLimits";

const ctx = self as unknown as {
  postMessage: (m: OcrResponse) => void;
  onmessage: ((e: MessageEvent<OcrRequest>) => void) | null;
};

const post = (m: OcrResponse) => ctx.postMessage(m);

/** Jobs the main thread has asked us to abandon. */
const cancelled = new Set<string>();

// ─── Tesseract pool, lazily created and cached ────────────────────────────────

/**
 * A scheduler over N independent tesseract workers.
 *
 * Recognition is ~95% of OCR cost (measured), tesseract ships no threaded WASM
 * build, and there is no SharedArrayBuffer here (no COOP/COEP) — so the only way
 * to go faster is more workers. createScheduler hands each queued job to
 * whichever worker is idle, which needs no shared memory at all.
 */
let poolPromise: Promise<Scheduler> | null = null;
let poolWorkers: TesseractWorker[] = [];
let idleTimer: ReturnType<typeof setTimeout> | null = null;

async function spawnWorker(): Promise<TesseractWorker> {
  const w = await createWorker(OCR_ASSETS.lang, OEM.LSTM_ONLY, {
    workerPath: OCR_ASSETS.workerPath,
    corePath: OCR_ASSETS.corePath,
    langPath: OCR_ASSETS.langPath,
    // Default true refetches the worker script and re-wraps it as a blob: URL.
    // CSP permits that, but it doubles the request and defeats caching.
    workerBlobURL: false,
    gzip: true,
  });
  await w.setParameters({
    // AUTO, not AUTO_OSD: orientation-and-script detection needs an
    // osd.traineddata we do not ship, so AUTO_OSD logged "Error opening data
    // file ./osd.traineddata" on every single page and fell back anyway. We
    // rasterize the pages ourselves and never rotate them, so there is no
    // orientation to detect — AUTO does the same layout analysis without it.
    tessedit_pageseg_mode: PSM.AUTO,
    // Tesseract cannot infer DPI from a bare bitmap; telling it suppresses a
    // warning and slightly improves layout analysis.
    user_defined_dpi: String(OCR_TARGET_DPI),
  });
  return w;
}

async function getPool(poolSize: number): Promise<Scheduler> {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (!poolPromise) {
    poolPromise = (async () => {
      const scheduler = createScheduler();

      // Staggered on purpose. Language data is cached in IndexedDB, but the
      // cache is read at worker start and written at the end, so N workers
      // spawned at once on a cold cache would all miss, all fetch the same
      // ~3MB, and all gunzip it synchronously. Awaiting the first worker warms
      // the cache and lets recognition begin at today's latency; the rest join
      // as they resolve, and addWorker() dequeues any waiting job itself.
      const first = await spawnWorker();
      poolWorkers.push(first);
      scheduler.addWorker(first);

      for (let i = 1; i < poolSize; i++) {
        void spawnWorker()
          .then((w) => {
            // Dropped if the pool was torn down while this was starting.
            if (poolPromise === null) {
              void w.terminate();
              return;
            }
            poolWorkers.push(w);
            scheduler.addWorker(w);
          })
          .catch(() => {
            // A worker that fails to start just means less parallelism.
          });
      }

      return scheduler;
    })().catch((err) => {
      // Never cache a failed init — the next job should retry from scratch.
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

function schedulePoolRelease() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    const p = poolPromise;
    poolPromise = null;
    idleTimer = null;
    const workers = poolWorkers;
    poolWorkers = [];
    try {
      const scheduler = await p;
      // terminate() on the scheduler stops its workers; terminating each
      // explicitly as well guarantees the WASM heaps go, since a parent
      // terminate does not reliably reclaim a nested worker in every engine.
      await scheduler?.terminate().catch(() => {});
      await Promise.all(workers.map((w) => w.terminate().catch(() => {})));
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

async function run(
  jobId: string,
  buffer: ArrayBuffer,
  pages: number[],
  poolSize: number
) {
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
    let pool: Scheduler;
    try {
      // Zero when the pool is already warm — which is the point of caching it
      // across jobs, and worth being able to confirm from the numbers.
      const warmStart = performance.now();
      pool = await getPool(poolSize);
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

    // Rasterize serially, recognize in parallel.
    //
    // Rendering stays serial: it reuses one canvas, and parallel rendering would
    // need N canvases (~16MB each) for a stage that measurement puts at 0.6% of
    // the cost. Recognition is the 95%, so each page's blob is handed to the
    // scheduler and awaited together — the pool then keeps every worker busy.
    //
    // In-flight work is bounded at poolSize + 1 so a 50-page job cannot buffer
    // 50 encoded bitmaps waiting for a free worker.
    const inFlight = new Set<Promise<void>>();
    let completedPages = 0;
    let recognizing = 0;
    let peakRecognizing = 0;
    let firstFailure: { message: string; pageNum: number } | null = null;

    for (let i = 0; i < pages.length; i++) {
      // Checked before each render and before each post, so a cancel lands
      // within roughly one page even with several in flight.
      if (cancelled.has(jobId) || firstFailure) break;

      const pageNum = pages[i];
      let blob: Blob;
      let renderMs = 0;
      let encodeMs = 0;
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
        renderMs = performance.now() - renderStart;

        const encodeStart = performance.now();
        blob = await canvas.convertToBlob({ type: "image/png" });
        encodeMs = performance.now() - encodeStart;
      } catch (err) {
        firstFailure = {
          message: err instanceof Error ? err.message : String(err),
          pageNum,
        };
        break;
      } finally {
        // Frees pdf.js's per-page operator list and font caches. Without this a
        // 50-page run climbs steadily.
        page?.cleanup();
      }

      const recognizeStart = performance.now();
      recognizing++;
      peakRecognizing = Math.max(peakRecognizing, recognizing);
      const job = pool
        .addJob("recognize", blob)
        .then(({ data }) => {
          recognizing--;
          if (cancelled.has(jobId)) return;
          pagesOcrd++;
          // Monotonic completion order, NOT the page's position in the list:
          // with several pages in flight results arrive out of order, and using
          // the index would make the progress bar jump backwards.
          completedPages++;
          post({
            type: "page",
            jobId,
            pageNum,
            index: completedPages,
            total: pages.length,
            lines: toLines(data.text ?? ""),
            confidence:
              typeof data.confidence === "number" ? data.confidence : 0,
            timings: {
              renderMs: Math.round(renderMs),
              encodeMs: Math.round(encodeMs),
              recognizeMs: Math.round(performance.now() - recognizeStart),
              bytes: blob.size,
            },
          });
        })
        .catch((err: unknown) => {
          recognizing = Math.max(0, recognizing - 1);
          firstFailure ??= {
            message: err instanceof Error ? err.message : String(err),
            pageNum,
          };
        })
        .finally(() => {
          inFlight.delete(job);
        });

      inFlight.add(job);
      // Backpressure: keep at most one spare page ahead of the pool.
      if (inFlight.size >= poolSize + 1) await Promise.race(inFlight);
    }

    // Drain whatever is still recognizing, so partial results are all streamed
    // before the job is reported done or failed.
    await Promise.all([...inFlight]);

    if (firstFailure) {
      fail(firstFailure.message, "recognize", firstFailure.pageNum);
      return;
    }
    if (cancelled.has(jobId)) return;

    post({
      type: "done",
      jobId,
      pagesOcrd,
      ms: Date.now() - started,
      warmMs,
      peakRecognizing,
      poolWorkers: poolWorkers.length,
    });
  } finally {
    if (canvas) {
      // Detach the backing store now rather than waiting for GC.
      canvas.width = 0;
      canvas.height = 0;
    }
    await pdf?.destroy().catch(() => {});
    cancelled.delete(jobId);
    schedulePoolRelease();
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
    void run(msg.jobId, msg.buffer, msg.pages, msg.poolSize ?? 1);
  }
};
