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
  OCR_MAX_PAGES_PER_SEARCH,
  type OcrDecision,
} from "./ocrLimits";
import { readDeviceCapability } from "@/lib/upload/limits";

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

interface ExtractedPage {
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
async function extractPdfText(
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
  /** Fires only for non-silent (large) OCR runs; null clears the panel. */
  onOcrProgress?: (progress: OcrProgress | null) => void;
  /** Reports the text-layer verdict per file, for telemetry. */
  onTextLayer?: (file: PdfFile, info: TextLayerReport) => void;
}

/** What the text-layer heuristic concluded about one file. */
export interface TextLayerReport {
  verdict: ReturnType<typeof classifyTextLayer>;
  totalPages: number;
  textlessPages: number[];
  /** The OCR gate's decision, so callers can report why it was skipped. */
  decision: OcrDecision;
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
  const results: SearchResult[] = [];
  let completed = 0;

  // Search-wide OCR page allowance, spent as files claim it. Held here rather
  // than in ocrClient module state so it cannot leak between searches, and so
  // an all-text search never imports the OCR chunk at all.
  const ocrBudget = { left: OCR_MAX_PAGES_PER_SEARCH };

  // Process files in chunks of `concurrency`
  for (let i = 0; i < files.length; i += concurrency) {
    if (signal?.aborted) break;

    const chunk = files.slice(i, i + concurrency);
    const chunkResults = await Promise.allSettled(
      chunk.map(async (file) => {
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
          const textlessPages = pages
            .filter((p) => pageIsTextless(p.textChars))
            .map((p) => p.pageNum);
          const verdict = classifyTextLayer({
            totalPages: pages.length,
            textlessPages: textlessPages.length,
          });

          let decision: OcrDecision = { run: false, reason: "no-need" };
          if (verdict !== "text") {
            decision = decideOcr(
              verdict,
              textlessPages,
              readDeviceCapability(),
              ocrSupported(),
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

          if (!decision.run && verdict !== "text" && decision.reason !== "no-need") {
            ocrSkipped = decision.reason;
          }

          if (options.ocr && decision.run && ocrBytes && !signal?.aborted) {
            try {
              const { runOcrJob } = await import("./ocrClient");
              const outcome = await runOcrJob({
                buffer: await ocrBytes(),
                pages: decision.pages,
                signal,
                onProgress: decision.silent
                  ? undefined
                  : (p) =>
                      options.onOcrProgress?.({
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
              if (outcome.confidence !== null) ocrConfidence = outcome.confidence;
              if (outcome.failed) {
                ocrSkipped =
                  outcome.failed.message === "cancelled" ? "cancelled" : "failed";
              }
            } catch {
              ocrSkipped = "failed";
            } finally {
              if (!decision.silent) options.onOcrProgress?.(null);
            }
          }

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
      })
    );

    for (const r of chunkResults) {
      if (r.status === "fulfilled" && r.value) {
        results.push(r.value);
      }
    }
  }

  onProgress?.({
    total: files.length,
    completed: files.length,
    currentFile: "",
    percentage: 100,
  });

  return results;
}

