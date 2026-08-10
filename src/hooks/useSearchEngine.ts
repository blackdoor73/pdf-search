/**
 * useSearchEngine
 *
 * Central hook managing the entire search workflow:
 * - File loading + deduplication
 * - Search execution with progress
 * - History persistence (cookies)
 * - Cancellation support
 */

"use client";

import { useState, useCallback, useRef } from "react";
import type {
  PdfFile,
  SearchState,
  SearchOptions,
  SearchProgress,
  OcrProgress,
  OcrProgressMap,
} from "@/types";
import { searchAllPdfs, sha256Hex, getPdfInfo } from "@/lib/pdf/engine";
import {
  validatePdfFile,
  sanitizeFilename,
  MAX_PDF_COUNT,
  MAX_SESSION_BYTES,
} from "@/lib/security";
import {
  getUserRepository,
  getOrCreateSessionId,
} from "@/lib/storage/userHistory";
import { track } from "@/lib/analytics/client";
import {
  classifyFileSize,
  computeConcurrency,
  computeFileLimit,
  oversizeWarning,
  readDeviceCapability,
  LIMIT_CEILING,
} from "@/lib/upload/limits";
import { releaseOcrIfLive } from "@/lib/pdf/ocrTeardown";
import { getPageTextCache, cacheKeyFor } from "@/lib/pdf/textCache";
import { useTextPrefetch } from "@/hooks/useTextPrefetch";
import { formatBytes } from "@/lib/utils";
export { formatBytes };

// ─── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_SEARCH_STATE: SearchState = {
  status: "idle",
  query: "",
  results: [],
  totalMatches: 0,
  filesSearched: 0,
  filesWithMatches: 0,
};

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  caseSensitive: false,
  wholeWord: false,
  showContext: true,
};

// ─── Per-document metadata telemetry ──────────────────────────────────────────

/**
 * Extracts document info (title/author/pages/…) for newly added local files
 * and fires one pdf_meta event each. Fire-and-forget with capped concurrency
 * so large batches never block the UI or spike memory.
 */
function reportFileMeta(added: PdfFile[], reported: Set<string>): void {
  const queue = added.filter(
    (f) => f.type === "file" && !reported.has(f.id)
  );
  for (const f of queue) reported.add(f.id);

  const worker = async () => {
    let f: PdfFile | undefined;
    while ((f = queue.shift())) {
      const start = performance.now();
      const base = {
        // Clamped to the 256-char prop limit the ingestion schema enforces —
        // an over-long filename would otherwise fail validation server-side.
        filename: f.name.slice(0, 256),
        sizeBytes: f.byteSize,
        sha256: f.contentHash ?? "",
        source: "file",
      };
      try {
        const buffer = await (f.source as File).arrayBuffer();
        const { pageCount, meta } = await getPdfInfo(buffer);
        track("pdf_meta", {
          ...base,
          ...meta,
          pageCount,
          status: "ok",
          processingMs: Math.round(performance.now() - start),
        });
      } catch {
        track("pdf_meta", {
          ...base,
          status: "error",
          processingMs: Math.round(performance.now() - start),
        });
      }
    }
  };
  void Promise.all([worker(), worker()]).catch(() => {});
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useSearchEngine() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [searchState, setSearchState] =
    useState<SearchState>(INITIAL_SEARCH_STATE);
  const [progress, setProgress] = useState<SearchProgress | null>(null);
  /**
   * Parallel to `progress` — page-granular, only for large OCR runs. Keyed by
   * file id rather than a single object, because several scanned files can be
   * read concurrently and each must own its own row.
   */
  const [ocrProgress, setOcrProgress] = useState<OcrProgressMap>({});

  const upsertOcrProgress = useCallback((p: OcrProgress) => {
    setOcrProgress((prev) => ({ ...prev, [p.fileId]: p }));
  }, []);

  // Per-file OCR cancel handles, registered by the engine while a file is being
  // read. A ref, not state: these are imperative callbacks, and re-rendering on
  // every registration would be pure churn.
  const ocrCancels = useRef<Map<string, () => void>>(new Map());

  const registerOcrCancel = useCallback((fileId: string, cancel: () => void) => {
    ocrCancels.current.set(fileId, cancel);
  }, []);
  const unregisterOcrCancel = useCallback((fileId: string) => {
    ocrCancels.current.delete(fileId);
  }, []);
  /** Stops OCR for one file, keeping whatever pages it already read. */
  const cancelFileOcr = useCallback((fileId: string) => {
    ocrCancels.current.get(fileId)?.();
  }, []);

  const clearOcrProgressFor = useCallback((fileId: string) => {
    setOcrProgress((prev) => {
      if (!(fileId in prev)) return prev;
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  }, []);
  const [searchOptions, setSearchOptions] =
    useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS);
  const [totalSizeBytes, setTotalSizeBytes] = useState(0);

  // Track content hashes for deduplication
  const contentHashes = useRef<Set<string>>(new Set());
  // Files whose pdf_meta telemetry has already been reported
  const reportedMetaIds = useRef<Set<string>>(new Set());
  // Cancellation controller
  const abortController = useRef<AbortController | null>(null);

  // Background text-layer extraction — starts at upload, yields to search.
  const prefetch = useTextPrefetch();

  // ── File management ──────────────────────────────────────────────────────

  const addFiles = useCallback(
    async (
      fileList: FileList | File[]
    ): Promise<{ added: number; skipped: string[]; warnings: string[] }> => {
      const incoming = Array.from(fileList);
      const skipped: string[] = [];
      const warnings: string[] = [];
      const toAdd: PdfFile[] = [];
      let addedSize = 0;

      // Comfortable size for *this* device — parsing happens in the visitor's
      // browser, so a phone and a 32GB desktop cannot share one flat cap.
      // Exceeding it warns; only LIMIT_CEILING actually refuses the file.
      const deviceLimit = computeFileLimit(readDeviceCapability());

      for (const file of incoming) {
        // Count limit
        if (files.length + toAdd.length >= MAX_PDF_COUNT) {
          skipped.push(`${file.name} (max ${MAX_PDF_COUNT} files reached)`);
          continue;
        }

        // Session size cap
        if (totalSizeBytes + addedSize + file.size > MAX_SESSION_BYTES) {
          skipped.push(
            `${file.name} (session limit ${formatBytes(MAX_SESSION_BYTES)} reached)`
          );
          continue;
        }

        // Validate against the absolute ceiling only — the device tier is a
        // warning, not a wall.
        const validation = await validatePdfFile(file, LIMIT_CEILING);
        if (!validation.valid) {
          skipped.push(validation.error ?? `${file.name} (validation failed)`);
          track("pdf_load_error", {
            code: validation.error ?? "validation_failed",
            sizeBytes: file.size,
            limitBytes: LIMIT_CEILING,
          });
          continue;
        }

        // Over this device's comfortable size but under the ceiling: load it
        // and tell them what to expect. It is their browser and their call.
        if (classifyFileSize(file.size, deviceLimit) === "warn") {
          warnings.push(oversizeWarning(file.name, file.size));
          track("pdf_oversize_warning", {
            sizeBytes: file.size,
            limitBytes: deviceLimit,
          });
        }

        // Deduplication by name+size (quick check before hash)
        const isDuplicate = files.some(
          (f) =>
            f.type === "file" &&
            (f.source as File).name === file.name &&
            (f.source as File).size === file.size
        );
        if (isDuplicate) {
          skipped.push(`${file.name} (already loaded)`);
          continue;
        }

        // Content-level deduplication: same bytes under a different name
        let contentHash: string | undefined;
        try {
          contentHash = await sha256Hex(await file.arrayBuffer());
          if (contentHashes.current.has(contentHash)) {
            skipped.push(`${file.name} (duplicate content)`);
            continue;
          }
          contentHashes.current.add(contentHash);
        } catch {
          // Hashing is best-effort — never block adding the file.
        }

        toAdd.push({
          id: crypto.randomUUID(),
          name: validation.sanitizedName ?? sanitizeFilename(file.name),
          type: "file",
          source: file,
          size: formatBytes(file.size),
          byteSize: file.size,
          contentHash,
          status: "ready",
        });
        addedSize += file.size;
      }

      if (toAdd.length > 0) {
        setFiles((prev) => [...prev, ...toAdd]);
        setTotalSizeBytes((prev) => prev + addedSize);

        // Aggregate telemetry (counts/sizes) — kept for existing dashboards
        track("pdf_upload", { count: toAdd.length, totalBytes: addedSize });

        // Per-document metadata telemetry (filename, doc info, hash — never
        // file content). Runs in the background so it can't block the UI.
        reportFileMeta(toAdd, reportedMetaIds.current);

        // Kick off background text-layer extraction so the first search is
        // faster — text-layer files become instant cache hits, scanned files
        // get their verdict cached (complete: false) so search knows to OCR.
        prefetch.enqueue(toAdd);

        // Persist to history (filenames only, no content)
        const repo = getUserRepository();
        const sessionId = getOrCreateSessionId();
        for (const f of toAdd) {
          await repo.addFileToHistory(sessionId, {
            id: f.id,
            name: f.name,
            type: "file",
            addedAt: Date.now(),
          });
        }
      }

      return { added: toAdd.length, skipped, warnings };
    },
    [files, totalSizeBytes, prefetch]
  );

  const addUrls = useCallback(
    async (
      urls: string[]
    ): Promise<{ added: number; skipped: string[] }> => {
      const { validateProxyUrl, sanitizeFilename } = await import(
        "@/lib/security"
      );
      const skipped: string[] = [];
      const toAdd: PdfFile[] = [];

      for (const rawUrl of urls) {
        const trimmed = rawUrl.trim();
        if (!trimmed) continue;

        if (files.length + toAdd.length >= MAX_PDF_COUNT) {
          skipped.push(`${trimmed} (max ${MAX_PDF_COUNT} files reached)`);
          continue;
        }

        const validation = validateProxyUrl(trimmed);
        if (!validation.valid) {
          skipped.push(`${trimmed} (${validation.error})`);
          continue;
        }

        // Deduplicate by URL
        const isDuplicate = files.some(
          (f) => f.type === "url" && f.source === trimmed
        );
        if (isDuplicate) {
          skipped.push(`${trimmed} (already loaded)`);
          continue;
        }

        const urlPath = new URL(trimmed).pathname;
        const filename =
          sanitizeFilename(urlPath.split("/").pop() || "") || "document.pdf";

        toAdd.push({
          id: crypto.randomUUID(),
          name: filename,
          type: "url",
          source: trimmed,
          size: "URL",
          byteSize: 0,
          status: "pending",
        });
      }

      if (toAdd.length > 0) {
        setFiles((prev) => [...prev, ...toAdd]);

        track("pdf_url_added", { count: toAdd.length });

        // Persist URL history
        const repo = getUserRepository();
        const sessionId = getOrCreateSessionId();
        for (const f of toAdd) {
          await repo.addFileToHistory(sessionId, {
            id: f.id,
            name: f.name,
            type: "url",
            url: f.source as string,
            addedAt: Date.now(),
          });
        }
      }

      return { added: toAdd.length, skipped };
    },
    [files]
  );

  const removeFile = useCallback((id: string) => {
    // Capture file info for cleanup outside the updater (React may invoke
    // updaters twice in StrictMode; keep side effects out).
    let removedFile: PdfFile | undefined;
    setFiles((prev) => {
      removedFile = prev.find((f) => f.id === id);
      if (!removedFile) return prev;
      if (removedFile.byteSize) {
        setTotalSizeBytes((s) => Math.max(0, s - removedFile!.byteSize));
      }
      return prev.filter((f) => f.id !== id);
    });
    if (removedFile) {
      // Clean up refs that addFiles populated — without this, removing then
      // re-adding the same file was rejected as "(duplicate content)".
      if (removedFile.contentHash) contentHashes.current.delete(removedFile.contentHash);
      reportedMetaIds.current.delete(id);
      clearOcrProgressFor(id);
      getPageTextCache().delete(cacheKeyFor(removedFile));
      prefetch.drop(id);
    }
  }, [clearOcrProgressFor, prefetch]);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setTotalSizeBytes(0);
    contentHashes.current.clear();
    reportedMetaIds.current.clear();
    setSearchState(INITIAL_SEARCH_STATE);
    setProgress(null);
    setOcrProgress({});
    getPageTextCache().clear();
    prefetch.reset();
    releaseOcrIfLive();
  }, [prefetch]);

  // ── Search ───────────────────────────────────────────────────────────────

  const search = useCallback(
    async (query: string) => {
      if (!query.trim() || files.length === 0) return;
      if (searchState.status === "running") return;

      // Pause background prefetch so the interactive search gets full
      // throughput — the prefetch queue resumes in `finally` below.
      prefetch.yieldToSearch();

      // Cancel any in-flight search
      abortController.current?.abort();
      abortController.current = new AbortController();


      const { sanitizeSearchQuery } = await import("@/lib/security");
      const safeQuery = sanitizeSearchQuery(query);
      if (!safeQuery) return;

      setSearchState({
        status: "running",
        query: safeQuery,
        results: [],
        totalMatches: 0,
        filesSearched: 0,
        filesWithMatches: 0,
        startedAt: Date.now(),
      });
      setProgress({ total: files.length, completed: 0, currentFile: "", percentage: 0 });

      try {
        const cache = getPageTextCache();
        const results = await searchAllPdfs(files, safeQuery, {
          ...searchOptions,
          ocr: true,
          textCache: {
            get: (f) => cache.get(cacheKeyFor(f)),
            set: (f, d) => cache.set(cacheKeyFor(f), d),
          },
          onOcrProgress: upsertOcrProgress,
          onOcrDone: clearOcrProgressFor,
          registerOcrCancel,
          unregisterOcrCancel,
          // Fires for every file whose text layer is missing or artifact-only,
          // whether or not OCR then runs — that is the only way to size how
          // common scanned PDFs actually are among real visitors.
          onTextLayer: (_f, info) => {
            if (info.verdict === "text") return;
            track("ocr_detected", {
              verdict: info.verdict,
              pageCount: info.totalPages,
              textlessPages: info.textlessPages.length,
              willOcr: info.decision.run,
              skipReason: info.decision.run ? "" : info.decision.reason,
            });
            if (!info.decision.run && info.decision.reason !== "no-need") {
              track("ocr_skipped", {
                reason: info.decision.reason,
                pages: info.textlessPages.length,
              });
            }
          },
          // Peak memory during a search is roughly concurrency × file size, so
          // a fixed 5 meant five large PDFs decoded at once — the real cause of
          // out-of-memory tab crashes, more than any single big file.
          concurrency: computeConcurrency(totalSizeBytes, files.length),
          onProgress: setProgress,
          signal: abortController.current.signal,
          // URL-sourced bytes only exist client-side during a search pass, so
          // pdf_meta for URL files is reported here (once per file).
          collectMeta: (f) =>
            f.type === "url" && !reportedMetaIds.current.has(f.id),
          onMeta: (f, info) => {
            if (reportedMetaIds.current.has(f.id)) return;
            reportedMetaIds.current.add(f.id);
            contentHashes.current.add(info.sha256);
            track("pdf_meta", {
              filename: f.name.slice(0, 256),
              sizeBytes: info.sizeBytes,
              sha256: info.sha256,
              source: "url",
              ...info.meta,
              pageCount: info.pageCount,
              status: "ok",
              processingMs: info.processingMs,
            });
          },
        });

        if (abortController.current.signal.aborted) return;

        const totalMatches = results.reduce(
          (sum, r) => sum + r.matches.length,
          0
        );
        const filesWithMatches = results.filter(
          (r) => r.matches.length > 0
        ).length;

        // Sort: files with matches first, then by match count desc
        results.sort((a, b) => b.matches.length - a.matches.length);

        setSearchState({
          status: "complete",
          query: safeQuery,
          results,
          totalMatches,
          filesSearched: results.length,
          filesWithMatches,
          startedAt: searchState.startedAt,
          completedAt: Date.now(),
        });

        const ocrFiles = results.filter((r) => r.ocrPages?.length);
        track("search", {
          q: safeQuery,
          matches: totalMatches,
          files: results.length,
          pages: results.reduce((sum, r) => sum + (r.totalPages || 0), 0),
          durationMs: Date.now() - (searchState.startedAt ?? Date.now()),
          ocrFiles: ocrFiles.length,
          ocrPages: ocrFiles.reduce((n, r) => n + (r.ocrPages?.length ?? 0), 0),
        });

        for (const r of ocrFiles) {
          track("ocr_run", {
            pagesOcrd: r.ocrPages?.length ?? 0,
            pagesRequested: r.textlessPages?.length ?? 0,
            ms: r.ocrMs ?? 0,
            confidence: Math.round(r.ocrConfidence ?? 0),
            matchesFound: r.matches.length,
            // Per-stage split, so field data can tell us where the time goes
            // rather than relying on one developer's laptop.
            queueWaitMs: r.ocrPerf?.queueWaitMs ?? 0,
            renderMs: r.ocrPerf?.renderMs ?? 0,
            encodeMs: r.ocrPerf?.encodeMs ?? 0,
            recognizeMs: r.ocrPerf?.recognizeMs ?? 0,
            warmMs: r.ocrPerf?.warmMs ?? 0,
            bytesPerPage: r.ocrPerf?.bytesPerPage ?? 0,
          });
        }
        for (const r of results) {
          if (r.ocrSkipped === "failed") {
            track("ocr_error", {
              stage: "recognize",
              pagesDone: r.ocrPages?.length ?? 0,
            });
          }
        }

        // Persist search to history
        const repo = getUserRepository();
        const sessionId = getOrCreateSessionId();
        await repo.addSearchToHistory(sessionId, {
          query: safeQuery,
          timestamp: Date.now(),
          matchCount: totalMatches,
        });
      } catch (err) {
        if (abortController.current.signal.aborted) return;
        track("search_error", {
          message: (err instanceof Error ? err.message : "Search failed").slice(0, 200),
        });
        setSearchState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Search failed",
        }));
      } finally {
        setProgress(null);
        setOcrProgress({});
        prefetch.resume();
      }
    },
    [
      files,
      searchOptions,
      searchState.status,
      searchState.startedAt,
      totalSizeBytes,
      prefetch,
    ]
  );

  const cancelSearch = useCallback(() => {
    abortController.current?.abort();
    setSearchState((prev) => ({ ...prev, status: "idle" }));
    setProgress(null);
    setOcrProgress({});
    // A user-initiated cancel should stop OCR immediately rather than waiting
    // for the worker to finish the page it is on.
    releaseOcrIfLive();
    prefetch.resume();
  }, [prefetch]);

  const clearResults = useCallback(() => {
    setSearchState(INITIAL_SEARCH_STATE);
    setProgress(null);
    setOcrProgress({});
  }, []);

  return {
    // State
    files,
    searchState,
    progress,
    ocrProgress,
    searchOptions,
    totalSizeBytes,
    // File actions
    addFiles,
    addUrls,
    removeFile,
    clearFiles,
    // Search actions
    search,
    cancelSearch,
    cancelFileOcr,
    clearResults,
    // Options
    setSearchOptions,
    // Derived
    canSearch: files.length > 0 && searchState.status !== "running",
    isSearching: searchState.status === "running",
  };
}

