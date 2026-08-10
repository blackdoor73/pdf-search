/**
 * PDF Processing Engine
 *
 * Handles:
 * - PDF text extraction via pdf.js
 * - Concurrent search across multiple PDFs
 * - Memory management (ArrayBuffer cleanup)
 *
 * All processing is in-memory. Nothing is written to disk.
 */

import type {
  PdfFile,
  SearchMatch,
  SearchResult,
  SearchOptions,
  SearchProgress,
  OcrProgress,
} from "@/types";
import { escapeRegex, createHighlightedHtml } from "@/lib/security";
import {
  classifyTextLayer,
  decideOcr,
  ocrSupported,
  pageIsTextless,
  refundBudget,
  OCR_MAX_PAGES_PER_SEARCH,
  type OcrDecision,
} from "./ocrLimits";
import { readDeviceCapability } from "@/lib/upload/limits";
import type { CachedDoc } from "./textCache";
import { estimateDocBytes } from "./textCache";

// ─── pdf.js initialization ────────────────────────────────────────────────────

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfjsLib() {
  if (pdfjsLib) return pdfjsLib;
  const lib = await import("pdfjs-dist");
  // Self-hosted worker, copied from the installed pdfjs-dist by
  // scripts/copy-pdf-worker.mjs (predev/prebuild) so the version always
  // matches package.json. Same-origin — no CDN dependency, no extra CSP
  // allowance, no cross-origin latency on first search.
  lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  pdfjsLib = lib;
  return lib;
}

// ─── Document metadata ────────────────────────────────────────────────────────

/** Embedded document info extracted via pdf.js getMetadata(). */
export type PdfDocMeta = Record<string, string>;

/** Map from pdf.js info-dict keys to our telemetry prop names. */
const INFO_KEYS: Record<string, string> = {
  Title: "title",
  Author: "author",
  Subject: "subject",
  Keywords: "keywords",
  Creator: "creator",
  Producer: "producer",
  CreationDate: "created",
  ModDate: "modified",
};

function readDocInfo(info: unknown): PdfDocMeta {
  const meta: PdfDocMeta = {};
  if (info && typeof info === "object") {
    for (const [key, out] of Object.entries(INFO_KEYS)) {
      const v = (info as Record<string, unknown>)[key];
      if (typeof v === "string" && v.trim()) meta[out] = v.trim().slice(0, 256);
    }
  }
  return meta;
}

/** SHA-256 of a PDF's bytes — content-level duplicate detection. */
export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Extracts page count + embedded document info from a PDF.
 * NOTE: pdf.js transfers the buffer to its worker (detaching it) — pass a
 * buffer you don't need afterwards.
 */
export async function getPdfInfo(
  buffer: ArrayBuffer
): Promise<{ pageCount: number; meta: PdfDocMeta }> {
  const pdfjs = await getPdfjsLib();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  try {
    const { info } = await pdf.getMetadata().catch(() => ({ info: {} }));
    return { pageCount: pdf.numPages, meta: readDocInfo(info) };
  } finally {
    await pdf.destroy().catch(() => {});
  }
}

// ─── Text extraction ──────────────────────────────────────────────────────────

export interface ExtractedPage {
  pageNum: number;
  lines: string[];
  /**
   * Non-whitespace characters in the embedded text layer.
   *
   * Counted from the raw items rather than from `lines`, because groupIntoLines
   * joins spans with a space — a page of 40 empty spans would otherwise score
   * 40 and read as "has text".
   */
  textChars: number;
  /** True when `lines` came from OCR rather than the embedded text layer. */
  fromOcr?: boolean;
}

/**
 * Extracts text from a PDF ArrayBuffer, grouped by line.
 * Returns pages with their text lines for efficient search; optionally also
 * reads the embedded document info while the document is open.
 */
export async function extractPdfText(
  buffer: ArrayBuffer,
  collectMeta = false
): Promise<{ pages: ExtractedPage[]; meta?: PdfDocMeta }> {
  const pdfjs = await getPdfjsLib();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  try {
    const pages: ExtractedPage[] = [];

    let meta: PdfDocMeta | undefined;
    if (collectMeta) {
      const { info } = await pdf.getMetadata().catch(() => ({ info: {} }));
      meta = readDocInfo(info);
    }

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      try {
        const content = await page.getTextContent();
        const items = content.items as Array<{ str: string; transform: number[] }>;
        const textChars = items.reduce(
          (n, item) => n + (item.str ? item.str.replace(/\s/g, "").length : 0),
          0
        );
        pages.push({ pageNum: p, lines: groupIntoLines(items), textChars });
      } finally {
        // Release the per-page operator list and font caches as we go.
        page.cleanup();
      }
    }

    return { pages, meta };
  } finally {
    // The document was previously left open on every call — pdf.js keeps the
    // transferred buffer and its parsed structures alive until destroyed.
    await pdf.destroy().catch(() => {});
  }
}

/**
 * Groups text items from pdf.js into logical lines by Y-coordinate proximity.
 * pdf.js returns individual text spans; we reassemble them into readable lines.
 */
function groupIntoLines(
  items: Array<{ str: string; transform: number[] }>
): string[] {
  if (items.length === 0) return [];

  // Group by rounded Y position
  const lineMap = new Map<number, string[]>();
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    if (!lineMap.has(y)) lineMap.set(y, []);
    lineMap.get(y)!.push(item.str);
  }

  // Sort by Y descending (PDF coordinates: y=0 is bottom)
  return Array.from(lineMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, strs]) =>
      strs
        .join(" ")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter((line) => line.length > 0);
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Searches extracted page text for the query.
 * Returns structured matches with safe highlighted HTML.
 */
function searchPages(
  pages: ExtractedPage[],
  query: string,
  options: SearchOptions
): SearchMatch[] {
  const { caseSensitive, wholeWord } = options;
  const matches: SearchMatch[] = [];

  // Build regex once for efficiency
  let pattern: RegExp;
  try {
    const escapedQuery = escapeRegex(query);
    const wordBoundary = wholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
    pattern = new RegExp(wordBoundary, caseSensitive ? "g" : "gi");
  } catch {
    return [];
  }

  for (const page of pages) {
    page.lines.forEach((line, lineIndex) => {
      // Reset lastIndex for global regex
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        matches.push({
          page: page.pageNum,
          lineIndex,
          text: line,
          highlightedHtml: createHighlightedHtml(line, query, caseSensitive),
        });
      }
    });
  }

  return matches;
}

// ─── File loading ─────────────────────────────────────────────────────────────

/**
 * Loads a PdfFile into an ArrayBuffer.
 * For 'file' type: reads from File object.
 * For 'url' type: fetches via the secure proxy API route.
 */
export async function loadPdfBuffer(file: PdfFile): Promise<ArrayBuffer> {
  if (file.type === "file") {
    return (file.source as File).arrayBuffer();
  }

  // URL type — fetch via server-side proxy (SSRF protection in API route)
  const url = file.source as string;
  const response = await fetch("/api/proxy-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Fetch failed" }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  // Decode base64 to ArrayBuffer
  const binaryStr = atob(data.data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}

// ─── Main search orchestrator ──────────────────────────────────────────────────

/** Metadata collected for a file during a search pass (see onMeta). */
export interface CollectedPdfMeta {
  pageCount: number;
  meta: PdfDocMeta;
  sha256: string;
  sizeBytes: number;
  processingMs: number;
}

export interface SearchOrchestrationOptions extends SearchOptions {
  concurrency?: number;
  onProgress?: (progress: SearchProgress) => void;
  signal?: AbortSignal;
  /** When both are set and collectMeta(file) is true, document metadata is
   *  extracted during the search pass (the only time URL-sourced bytes exist
   *  client-side) and reported via onMeta. */
  collectMeta?: (file: PdfFile) => boolean;
  onMeta?: (file: PdfFile, info: CollectedPdfMeta) => void;
  /**
   * Master switch for OCR of scanned pages. Off by default so the detection
   * pass can ship — and be measured — before the OCR pass is enabled.
   */
  ocr?: boolean;
  /** Fires only for non-silent (large) OCR runs, once per progress update. */
  onOcrProgress?: (progress: OcrProgress) => void;
  /** This file's OCR finished — drop its progress row. */
  onOcrDone?: (fileId: string) => void;
  /** Offers a per-file OCR cancel, so one slow scan can be dropped alone. */
  registerOcrCancel?: (fileId: string, cancel: () => void) => void;
  unregisterOcrCancel?: (fileId: string) => void;
  /** Reports the text-layer verdict per file, for telemetry. */
  onTextLayer?: (file: PdfFile, info: TextLayerReport) => void;
  /** Caller-injected memo of extracted text. Engine keeps no module state and
   *  stays unit-testable. A complete hit skips loadPdfBuffer, pdf.js, and OCR. */
  textCache?: {
    get(file: PdfFile): CachedDoc | undefined;
    set(file: PdfFile, doc: CachedDoc): void;
  };
}

/** What the text-layer heuristic concluded about one file. */
export interface TextLayerReport {
  verdict: ReturnType<typeof classifyTextLayer>;
  totalPages: number;
  textlessPages: number[];
  /** The OCR gate's decision, so callers can report why it was skipped. */
  decision: OcrDecision;
}

/** Classify an already-extracted document's text layer. Shared by the search
 *  path and the prefetch path so the two cannot drift. */
export function judgeTextLayer(pages: ExtractedPage[]): {
  verdict: ReturnType<typeof classifyTextLayer>;
  textlessPages: number[];
} {
  const textlessPages = pages
    .filter((p) => pageIsTextless(p.textChars))
    .map((p) => p.pageNum);
  const verdict = classifyTextLayer({
    totalPages: pages.length,
    textlessPages: textlessPages.length,
  });
  return { verdict, textlessPages };
}

/**
 * Searches across all provided PDF files concurrently.
 * Respects concurrency limits to avoid memory exhaustion.
 * Supports cancellation via AbortSignal.
 */
export async function searchAllPdfs(
  files: PdfFile[],
  query: string,
  options: SearchOrchestrationOptions
): Promise<SearchResult[]> {
  const { concurrency = 5, onProgress, signal } = options;
  let completed = 0;

  // Search-wide OCR page allowance, spent as files claim it. Held here rather
  // than in ocrClient module state so it cannot leak between searches, and so
  // an all-text search never imports the OCR chunk at all.
  const ocrBudget = { left: OCR_MAX_PAGES_PER_SEARCH };

  // Read once, not per file: capability cannot change mid-search, and this
  // allocates plus runs a UA regex on every call.
  const deviceCap = readDeviceCapability();
  const canOcr = ocrSupported();

  const processFile = async (file: PdfFile): Promise<SearchResult | null> => {
    if (signal?.aborted) return null;

    onProgress?.({
      total: files.length,
      completed,
      currentFile: file.name,
      percentage: Math.round((completed / files.length) * 100),
    });

    const startMs = performance.now();

    // Page count survives a mid-extraction failure so the catch below can
    // still report it (it used to always return 0).
    let pageCount = 0;

    try {
      const wantMeta = Boolean(
        options.onMeta && options.collectMeta?.(file)
      );

      // ── Cache hit — skip loadPdfBuffer, pdf.js, and OCR entirely ────
      const cached = !wantMeta ? options.textCache?.get(file) : undefined;
      if (cached && cached.complete) {
        const pages = cached.pages;
        pageCount = pages.length;
        const matches = searchPages(pages, query, options);
        const durationMs = Math.round(performance.now() - startMs);

        try {
          options.onTextLayer?.(file, {
            verdict: cached.verdict,
            totalPages: pages.length,
            textlessPages: cached.textlessPages,
            decision: { run: false, reason: "no-need" },
          });
        } catch { /* reporting must never break search */ }

        return {
          fileId: file.id,
          fileName: file.name,
          sourceType: file.type,
          sourceUrl: file.type === "url" ? (file.source as string) : undefined,
          matches,
          matchedPages: Array.from(new Set(matches.map((m) => m.page))),
          totalPages: pages.length,
          searchDurationMs: durationMs,
          textLayer: cached.verdict,
          textlessPages: cached.textlessPages.length > 0 ? cached.textlessPages : undefined,
          ocrPages: cached.ocrPages.length > 0 ? cached.ocrPages : undefined,
          sampleText: pages
            .find((p) => p.lines.length > 0)
            ?.lines.join("\n")
            .slice(0, 600),
        };
      }

      // ── Cold path — full extraction ──────────────────────────────────
      const buffer = await loadPdfBuffer(file);
      const sizeBytes = buffer.byteLength;
      // Hash before extraction — pdf.js transfers (detaches) the buffer.
      const sha = wantMeta ? await sha256Hex(buffer) : null;

      // A second copy of the bytes for a possible OCR pass, taken BEFORE
      // getDocument detaches the buffer. For local files we re-read the
      // File handle instead, so the common case costs no extra memory —
      // peak usage is already concurrency x file size (see limits.ts).
      const ocrBytes: (() => Promise<ArrayBuffer>) | null = !options.ocr
        ? null
        : file.type === "file"
          ? () => (file.source as File).arrayBuffer()
          : (() => {
              const copy = buffer.slice(0);
              return async () => copy;
            })();

      const { pages, meta } = await extractPdfText(buffer, wantMeta);
      pageCount = pages.length;

      // ── Text-layer verdict ────────────────────────────────────────────
      const { verdict, textlessPages } = judgeTextLayer(pages);

      let decision: OcrDecision = { run: false, reason: "no-need" };
      if (verdict !== "text") {
        decision = decideOcr(
          verdict,
          textlessPages,
          deviceCap,
          canOcr,
          options.ocr ? ocrBudget.left : 0
        );
        // Claim the pages now: two files whose decisions land before either
        // finishes must not each believe the whole allowance is theirs.
        if (decision.run) ocrBudget.left -= decision.pages.length;
      }

      try {
        options.onTextLayer?.(file, {
          verdict,
          totalPages: pages.length,
          textlessPages,
          decision,
        });
      } catch {
        // Reporting must never break search.
      }

      // ── OCR pass ──────────────────────────────────────────────────────
      // Strictly additive: any failure leaves the text-layer result intact.
      let ocrPages: number[] | undefined;
      let ocrSkipped: SearchResult["ocrSkipped"];
      let ocrConfidence: number | undefined;
      let ocrMs: number | undefined;
      let ocrPerf: SearchResult["ocrPerf"];

      if (!decision.run && verdict !== "text" && decision.reason !== "no-need") {
        ocrSkipped = decision.reason;
      }

      if (options.ocr && decision.run && ocrBytes && !signal?.aborted) {
        // A per-file controller chained to the search signal, so one file's OCR
        // can be cancelled without abandoning the whole search — its partial
        // pages are still kept and merged. Declared out here so the `finally`
        // below can detach the relay listener.
        const fileAbort = new AbortController();
        const relaySearchAbort = () => fileAbort.abort();
        signal?.addEventListener("abort", relaySearchAbort, { once: true });
        options.registerOcrCancel?.(file.id, () => fileAbort.abort());

        try {
          const { runOcrJob } = await import("./ocrClient");
          const outcome = await runOcrJob({
            buffer: await ocrBytes(),
            pages: decision.pages,
            signal: fileAbort.signal,
            onProgress: decision.silent
              ? undefined
              : (p) =>
                  options.onOcrProgress?.({
                    fileId: file.id,
                    fileName: file.name,
                    pagesDone: p.pagesDone,
                    pagesTotal: p.pagesTotal,
                    phase: p.phase,
                  }),
          });

          // Merge into pages[].lines so searchPages needs no knowledge of
          // provenance — OCR text becomes searchable, highlightable and
          // exportable through the existing paths.
          for (const page of pages) {
            const lines = outcome.pageLines.get(page.pageNum);
            if (lines && lines.length > 0) {
              page.lines = lines;
              page.fromOcr = true;
            }
          }
          ocrPages = [...outcome.pageLines.keys()].sort((a, b) => a - b);
          ocrMs = outcome.ms;
          ocrPerf = {
            queueWaitMs: outcome.queueWaitMs,
            renderMs: outcome.stageMs?.render,
            encodeMs: outcome.stageMs?.encode,
            recognizeMs: outcome.stageMs?.recognize,
            warmMs: outcome.stageMs?.warm,
            bytesPerPage: outcome.bytesPerPage,
            peakRecognizing: outcome.peakRecognizing,
            poolWorkers: outcome.poolWorkers,
          };
          if (outcome.confidence !== null) ocrConfidence = outcome.confidence;
          if (outcome.failed) {
            ocrSkipped =
              outcome.failed.message === "cancelled" ? "cancelled" : "failed";
          }
        } catch {
          ocrSkipped = "failed";
        } finally {
          // Clear only THIS file's row. Nulling the whole channel here blanked
          // every other file that was still being read.
          if (!decision.silent) options.onOcrDone?.(file.id);
          options.unregisterOcrCancel?.(file.id);
          // Drop the relay, or every completed file leaves a listener on the
          // search signal for the rest of the search.
          signal?.removeEventListener("abort", relaySearchAbort);
        }
      }

      // Return the pages claimed but not spent. Placed outside the block
      // above so it covers every path out of a claim — including the case
      // where `decision.run` was true but the guard declined (no bytes, or
      // an abort landed in between), which reaches no `finally` at all.
      // Without this, one failed scan permanently consumes up to
      // OCR_MAX_PAGES of the search allowance and later scanned files get
      // `reason: "budget"` and silently return zero matches.
      if (decision.run) {
        ocrBudget.left += refundBudget(
          decision.pages.length,
          ocrPages?.length ?? 0
        );
      }

      // ── Store to cache ─────────────────────────────────────────────
      try {
        options.textCache?.set(file, {
          pages: pages.map((p) => ({
            pageNum: p.pageNum,
            lines: p.lines,
            textChars: p.textChars,
            fromOcr: p.fromOcr,
          })),
          verdict,
          textlessPages,
          ocrPages: ocrPages ? [...ocrPages] : [],
          complete:
            verdict === "text" ||
            textlessPages.every((p) => ocrPages?.includes(p)),
          bytes: estimateDocBytes(pages),
          storedAt: Date.now(),
        });
      } catch { /* cache store must never break search */ }

      const matches = searchPages(pages, query, options);
      const durationMs = Math.round(performance.now() - startMs);

      if (wantMeta && sha) {
        try {
          options.onMeta!(file, {
            pageCount: pages.length,
            meta: meta ?? {},
            sha256: sha,
            sizeBytes,
            processingMs: durationMs,
          });
        } catch {
          // Metadata reporting must never break search.
        }
      }

      const result: SearchResult = {
        fileId: file.id,
        fileName: file.name,
        sourceType: file.type,
        sourceUrl: file.type === "url" ? (file.source as string) : undefined,
        matches,
        matchedPages: Array.from(new Set(matches.map((m) => m.page))),
        totalPages: pages.length,
        searchDurationMs: durationMs,
        textLayer: verdict,
        textlessPages: textlessPages.length > 0 ? textlessPages : undefined,
        ocrPages: ocrPages && ocrPages.length > 0 ? ocrPages : undefined,
        ocrSkipped,
        ocrConfidence,
        ocrMs,
        ocrPerf,
        // First page with any text, for the OPT-IN issue-report excerpt.
        // Page 1 of a scan is often a blank cover, hence "first with text".
        sampleText: pages
          .find((p) => p.lines.length > 0)
          ?.lines.join("\n")
          .slice(0, 600),
      };

      return result;
    } catch (err) {
      // Return a result with 0 matches + error info rather than crashing.
      // `error` is a real field on SearchResult now, so no cast is needed.
      const result: SearchResult = {
        fileId: file.id,
        fileName: file.name,
        sourceType: file.type,
        sourceUrl: file.type === "url" ? (file.source as string) : undefined,
        matches: [],
        matchedPages: [],
        // Keep whatever we learned before failing — this was hardcoded to 0,
        // which lost the page count on a mid-extraction failure.
        totalPages: pageCount,
        searchDurationMs: Math.round(performance.now() - startMs),
        error: err instanceof Error ? err.message : "Unknown error",
      };
      return result;
    } finally {
      completed++;
    }
  };

  // A sliding window, not chunked batches.
  //
  // This used to `await Promise.allSettled` over each chunk of `concurrency`
  // files, which is a barrier: one slow file (a 50-page scan takes ~75s) held
  // up every file in later chunks, even though they had work they could do.
  // Now each runner takes the next file the moment it frees up, so a slow file
  // costs only its own slot. Peak memory is unchanged — still at most
  // `concurrency` buffers in flight, which is what computeConcurrency bounds.
  //
  // Results are written by index rather than pushed, making the output order
  // deterministic (chunked push order was not).
  const results: (SearchResult | null)[] = new Array(files.length).fill(null);
  let next = 0;
  const runners = Array.from(
    { length: Math.max(1, Math.min(concurrency, files.length)) },
    async () => {
      for (;;) {
        if (signal?.aborted) return;
        const index = next++;
        if (index >= files.length) return;
        // processFile never throws — it returns an error-bearing SearchResult —
        // but a defensive catch keeps one unexpected failure from killing a
        // runner and silently reducing concurrency for the rest of the search.
        try {
          results[index] = await processFile(files[index]);
        } catch {
          results[index] = null;
        }
      }
    }
  );
  await Promise.all(runners);

  onProgress?.({
    total: files.length,
    completed: files.length,
    currentFile: "",
    percentage: 100,
  });

  return results.filter((r): r is SearchResult => r !== null);
}

