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
import { v4 as uuidv4 } from "uuid";
import type {
  PdfFile,
  SearchState,
  SearchOptions,
  SearchProgress,
} from "@/types";
import { searchAllPdfs } from "@/lib/pdf/engine";
import { validatePdfFile, sanitizeFilename, MAX_PDF_COUNT } from "@/lib/security";
import {
  getUserRepository,
  getOrCreateSessionId,
} from "@/lib/storage/userHistory";

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

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useSearchEngine() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [searchState, setSearchState] =
    useState<SearchState>(INITIAL_SEARCH_STATE);
  const [progress, setProgress] = useState<SearchProgress | null>(null);
  const [searchOptions, setSearchOptions] =
    useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS);
  const [totalSizeBytes, setTotalSizeBytes] = useState(0);

  // Track content hashes for deduplication
  const contentHashes = useRef<Set<string>>(new Set());
  // Cancellation controller
  const abortController = useRef<AbortController | null>(null);

  // ── File management ──────────────────────────────────────────────────────

  const addFiles = useCallback(
    async (
      fileList: FileList | File[]
    ): Promise<{ added: number; skipped: string[] }> => {
      const incoming = Array.from(fileList);
      const skipped: string[] = [];
      const toAdd: PdfFile[] = [];
      let addedSize = 0;

      for (const file of incoming) {
        // Count limit
        if (files.length + toAdd.length >= MAX_PDF_COUNT) {
          skipped.push(`${file.name} (max ${MAX_PDF_COUNT} files reached)`);
          continue;
        }

        // Validate
        const validation = await validatePdfFile(file);
        if (!validation.valid) {
          skipped.push(`${file.name} (${validation.error})`);
          continue;
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

        toAdd.push({
          id: uuidv4(),
          name: validation.sanitizedName ?? sanitizeFilename(file.name),
          type: "file",
          source: file,
          size: formatBytes(file.size),
          byteSize: file.size,
          status: "ready",
        });
        addedSize += file.size;
      }

      if (toAdd.length > 0) {
        setFiles((prev) => [...prev, ...toAdd]);
        setTotalSizeBytes((prev) => prev + addedSize);

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

      return { added: toAdd.length, skipped };
    },
    [files]
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
          id: uuidv4(),
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
    setFiles((prev) => {
      const removed = prev.find((f) => f.id === id);
      if (removed?.byteSize) {
        setTotalSizeBytes((s) => Math.max(0, s - removed.byteSize));
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setTotalSizeBytes(0);
    contentHashes.current.clear();
    setSearchState(INITIAL_SEARCH_STATE);
    setProgress(null);
  }, []);

  // ── Search ───────────────────────────────────────────────────────────────

  const search = useCallback(
    async (query: string) => {
      if (!query.trim() || files.length === 0) return;
      if (searchState.status === "running") return;

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
        const results = await searchAllPdfs(files, safeQuery, {
          ...searchOptions,
          concurrency: 5,
          onProgress: setProgress,
          signal: abortController.current.signal,
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
        setSearchState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Search failed",
        }));
      } finally {
        setProgress(null);
      }
    },
    [files, searchOptions, searchState.status, searchState.startedAt]
  );

  const cancelSearch = useCallback(() => {
    abortController.current?.abort();
    setSearchState((prev) => ({ ...prev, status: "idle" }));
    setProgress(null);
  }, []);

  const clearResults = useCallback(() => {
    setSearchState(INITIAL_SEARCH_STATE);
    setProgress(null);
  }, []);

  return {
    // State
    files,
    searchState,
    progress,
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
    clearResults,
    // Options
    setSearchOptions,
    // Derived
    canSearch: files.length > 0 && searchState.status !== "running",
    isSearching: searchState.status === "running",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
