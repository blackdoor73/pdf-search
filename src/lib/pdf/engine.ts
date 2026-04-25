/**
 * PDF Processing Engine
 *
 * Handles:
 * - PDF text extraction via pdf.js
 * - Concurrent search across multiple PDFs
 * - Content-based deduplication (SHA-256)
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
} from "@/types";
import {
  escapeRegex,
  createHighlightedHtml,
  computeContentHash,
} from "@/lib/security";

// ─── pdf.js initialization ────────────────────────────────────────────────────

let pdfjsLib: typeof import("pdfjs-dist") | null = null;

async function getPdfjsLib() {
  if (pdfjsLib) return pdfjsLib;
  const lib = await import("pdfjs-dist");
  // Use the CDN-hosted worker. import.meta.url is unreliable in Next.js App Router
  // because the server bundle resolves it differently from the browser.
  // The CDN worker is pinned to the same version as pdfjs-dist in package.json.
  lib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version}/pdf.worker.min.mjs`;
  pdfjsLib = lib;
  return lib;
}

// ─── Text extraction ──────────────────────────────────────────────────────────

interface ExtractedPage {
  pageNum: number;
  lines: string[];
}

/**
 * Extracts text from a PDF ArrayBuffer, grouped by line.
 * Returns pages with their text lines for efficient search.
 */
async function extractPdfText(buffer: ArrayBuffer): Promise<ExtractedPage[]> {
  const pdfjs = await getPdfjsLib();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const pages: ExtractedPage[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const lines = groupIntoLines(content.items as Array<{ str: string; transform: number[] }>);
    pages.push({ pageNum: p, lines });
  }

  return pages;
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

export interface SearchOrchestrationOptions extends SearchOptions {
  concurrency?: number;
  onProgress?: (progress: SearchProgress) => void;
  signal?: AbortSignal;
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

        try {
          const buffer = await loadPdfBuffer(file);
          const pages = await extractPdfText(buffer);
          const matches = searchPages(pages, query, options);
          const durationMs = Math.round(performance.now() - startMs);

          const result: SearchResult = {
            fileId: file.id,
            fileName: file.name,
            sourceType: file.type,
            sourceUrl: file.type === "url" ? (file.source as string) : undefined,
            matches,
            matchedPages: Array.from(new Set(matches.map((m) => m.page))),
            totalPages: pages.length,
            searchDurationMs: durationMs,
          };

          return result;
        } catch (err) {
          // Return a result with 0 matches + error info rather than crashing
          return {
            fileId: file.id,
            fileName: file.name,
            sourceType: file.type,
            sourceUrl: file.type === "url" ? (file.source as string) : undefined,
            matches: [],
            matchedPages: [],
            totalPages: 0,
            searchDurationMs: Math.round(performance.now() - startMs),
            error: err instanceof Error ? err.message : "Unknown error",
          } as SearchResult & { error: string };
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

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Checks if a file's content already exists in the loaded set.
 * Uses SHA-256 content hash for reliable deduplication.
 */
export async function isDuplicate(
  buffer: ArrayBuffer,
  existingHashes: Set<string>
): Promise<{ duplicate: boolean; hash: string }> {
  const hash = await computeContentHash(buffer);
  return { duplicate: existingHashes.has(hash), hash };
}
