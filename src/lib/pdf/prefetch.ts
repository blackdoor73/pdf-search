/**
 * Background text-layer extraction for uploaded PDFs.
 *
 * Runs one file at a time (no concurrency multiplier on top of search),
 * scheduling work during idle periods. Stores results in the text cache so
 * subsequent searches hit the fast path.
 *
 * The key contract: when an interactive search starts, the caller calls
 * `yieldToSearch()` which aborts any in-flight extraction immediately. The
 * partially-extracted doc is still cached (with `complete: false`), so no
 * work is lost. `resume()` picks up from where it left off.
 */

import type { PdfFile } from "@/types";
import type { CachedDoc, CachedPage } from "./textCache";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PrefetchCallbacks {
  getCache: (file: PdfFile) => CachedDoc | undefined;
  setCache: (file: PdfFile, doc: CachedDoc) => void;
  /** Override for testing — replaces the real loadPdfBuffer + extractPdfText. */
  extractFile?: (file: PdfFile, signal: AbortSignal) => Promise<void>;
}

// ─── Idle scheduling ────────────────────────────────────────────────────────

function nextIdle(timeoutMs = 2000): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => resolve(), { timeout: timeoutMs });
    } else {
      setTimeout(resolve, 200);
    }
  });
}

// ─── Controller ─────────────────────────────────────────────────────────────

export interface PrefetchController {
  enqueue(files: PdfFile[]): void;
  yieldToSearch(): void;
  resume(): void;
  drop(fileId: string): void;
  reset(): void;
}

export function createPrefetchController(
  callbacks: PrefetchCallbacks
): PrefetchController {
  const queue: PdfFile[] = [];
  let abortCtrl: AbortController | null = null;
  let paused = false;
  let running = false;

  const doExtract = callbacks.extractFile ?? defaultExtractFile;

  async function processQueue(): Promise<void> {
    if (running) return;
    running = true;

    try {
      while (queue.length > 0) {
        if (paused) break;

        const file = queue[0];

        const cached = callbacks.getCache(file);
        if (cached?.complete) {
          queue.shift();
          continue;
        }

        await nextIdle();
        if (paused) break;

        abortCtrl = new AbortController();
        try {
          await doExtract(file, abortCtrl.signal);
        } catch {
          // Aborted or failed — move on. Partial results may already be
          // cached by the extract function.
        } finally {
          abortCtrl = null;
        }

        if (queue[0]?.id === file.id) {
          queue.shift();
        }
      }
    } finally {
      running = false;
    }
  }

  async function defaultExtractFile(
    file: PdfFile,
    signal: AbortSignal
  ): Promise<void> {
    if (signal.aborted) return;

    const { loadPdfBuffer, extractPdfText, judgeTextLayer } = await import(
      "./engine"
    );
    const { estimateDocBytes } = await import("./textCache");

    const buffer = await loadPdfBuffer(file);
    if (signal.aborted) return;

    const { pages } = await extractPdfText(buffer);

    const { verdict, textlessPages } = judgeTextLayer(pages);
    const cachedPages: CachedPage[] = pages.map((p) => ({
      pageNum: p.pageNum,
      lines: p.lines,
      textChars: p.textChars,
      fromOcr: p.fromOcr,
    }));

    callbacks.setCache(file, {
      pages: cachedPages,
      verdict,
      textlessPages,
      ocrPages: [],
      complete: verdict === "text",
      bytes: estimateDocBytes(cachedPages),
      storedAt: Date.now(),
    });
  }

  return {
    enqueue(files) {
      for (const f of files) {
        if (f.type !== "file") continue;
        if (queue.some((q) => q.id === f.id)) continue;
        const cached = callbacks.getCache(f);
        if (cached?.complete) continue;
        queue.push(f);
      }
      if (!paused) void processQueue();
    },

    yieldToSearch() {
      paused = true;
      abortCtrl?.abort();
    },

    resume() {
      if (!paused) return;
      paused = false;
      if (queue.length > 0) void processQueue();
    },

    drop(fileId) {
      const idx = queue.findIndex((f) => f.id === fileId);
      if (idx !== -1) queue.splice(idx, 1);
    },

    reset() {
      queue.length = 0;
      paused = false;
      abortCtrl?.abort();
    },
  };
}
