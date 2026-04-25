"use client";

import { useEffect, useCallback } from "react";
import { ShieldCheck, Download, Keyboard } from "lucide-react";
import { UploadZone } from "@/components/upload/UploadZone";
import { UrlInput } from "@/components/upload/UrlInput";
import { FileList } from "@/components/upload/FileList";
import { QuickLoad } from "@/components/upload/QuickLoad";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchProgress } from "@/components/search/SearchProgress";
import { ResultCard } from "@/components/search/ResultCard";
import { ResultsSummary } from "@/components/search/ResultsSummary";
import { PrivacyBadge } from "@/components/ui/PrivacyBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useSearchEngine } from "@/hooks/useSearchEngine";
import { useUserHistory } from "@/hooks/useUserHistory";
import { useToast } from "@/components/ui/Toast";
import type { SearchResult } from "@/types";

export default function HomePage() {
  const toast = useToast();

  const {
    files,
    searchState,
    progress,
    searchOptions,
    totalSizeBytes,
    addFiles,
    addUrls,
    removeFile,
    clearFiles,
    search,
    cancelSearch,
    setSearchOptions,
    canSearch,
    isSearching,
  } = useSearchEngine();

  const { recentUrls, recentSearches } = useUserHistory();

  const showResults =
    searchState.status === "complete" || searchState.status === "error";
  const hasMatches = searchState.filesWithMatches > 0;

  // ── Handlers with toast feedback ─────────────────────────────────────────

  const handleAddFiles = useCallback(
    async (incoming: File[]) => {
      const result = await addFiles(incoming);
      if (result.added > 0) {
        toast.success(
          `${result.added} PDF${result.added > 1 ? "s" : ""} loaded${
            result.skipped.length > 0 ? ` · ${result.skipped.length} skipped` : ""
          }`
        );
      } else if (result.skipped.length > 0) {
        toast.warning(result.skipped[0]);
      }
      return result;
    },
    [addFiles, toast]
  );

  const handleAddUrls = useCallback(
    async (urls: string[]) => {
      const result = await addUrls(urls);
      if (result.added > 0) {
        toast.success(
          `${result.added} URL${result.added > 1 ? "s" : ""} queued${
            result.skipped.length > 0 ? ` · ${result.skipped.length} skipped` : ""
          }`
        );
      } else if (result.skipped.length > 0) {
        toast.warning(result.skipped[0]);
      }
      return result;
    },
    [addUrls, toast]
  );

  // Surface search errors as toasts
  useEffect(() => {
    if (searchState.status === "error" && searchState.error) {
      toast.error(`Search error: ${searchState.error}`);
    }
  }, [searchState.status, searchState.error, toast]);

  // ── Export results as CSV ─────────────────────────────────────────────────

  const exportResults = useCallback(() => {
    if (!hasMatches) return;
    const rows: string[] = [
      ["File", "Source URL", "Page", "Matched Text"].join(","),
    ];
    for (const result of searchState.results) {
      if (result.matches.length === 0) continue;
      for (const match of result.matches) {
        rows.push(
          [
            `"${result.fileName.replace(/"/g, '""')}"`,
            `"${(result.sourceUrl ?? "").replace(/"/g, '""')}"`,
            match.page,
            `"${match.text.replace(/"/g, '""')}"`,
          ].join(",")
        );
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pdfsearch-${searchState.query
      .slice(0, 30)
      .replace(/\s+/g, "-")}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Results exported as CSV");
  }, [hasMatches, searchState.results, searchState.query, toast]);

  // ── Global keyboard shortcut: ⌘K / Ctrl+K → focus search ────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>(
          'input[aria-label="Search query"]'
        );
        input?.focus();
        input?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] grid-bg">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-7 h-7 bg-[var(--accent)] flex items-center justify-center">
              <span className="font-mono text-[10px] font-bold text-black tracking-tight">
                PDF
              </span>
            </div>
            <span className="font-mono text-base font-semibold text-[var(--text)]">
              Search<span className="text-[var(--accent)]">.</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1.5">
              <Keyboard className="w-3 h-3 text-[var(--text-3)]" />
              <kbd className="font-mono text-[10px] text-[var(--text-3)] px-1.5 py-0.5 bg-[var(--surface2)] border border-[var(--border)]">
                ⌘K
              </kbd>
              <span className="font-mono text-[10px] text-[var(--text-3)]">
                to search
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--green)]" />
              <span className="hidden sm:inline font-mono text-xs text-[var(--text-3)]">
                Files never stored
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Hero */}
        <section className="animate-slide-in stagger-1">
          <h1 className="font-mono text-3xl sm:text-4xl lg:text-5xl font-semibold leading-[1.05] tracking-tight text-[var(--text)] mb-3">
            Find anything across
            <br />
            <span className="text-[var(--accent)]">every</span> PDF.
          </h1>
          <p className="font-sans text-sm text-[var(--text-2)] max-w-md leading-relaxed">
            Upload files or paste URLs. Search all of them simultaneously.
            Nothing leaves your browser — ever.
          </p>
        </section>

        {/* 01 — Load PDFs */}
        <section className="space-y-3 animate-slide-in stagger-2">
          <div className="section-label">01 — Load PDFs</div>
          <ErrorBoundary>
            <UploadZone onFiles={handleAddFiles} disabled={isSearching} />
          </ErrorBoundary>
          <ErrorBoundary>
            <UrlInput
              onAddUrls={handleAddUrls}
              recentUrls={recentUrls}
              disabled={isSearching}
            />
          </ErrorBoundary>
          <QuickLoad onAddUrls={handleAddUrls} disabled={isSearching} />
        </section>

        {/* Loaded files */}
        {files.length > 0 && (
          <section className="animate-slide-in">
            <FileList
              files={files}
              onRemove={removeFile}
              onClearAll={() => {
                clearFiles();
                toast.info("All files cleared");
              }}
              totalSizeBytes={totalSizeBytes}
            />
          </section>
        )}

        {/* 02 — Search */}
        <section className="space-y-3 animate-slide-in stagger-3">
          <div className="section-label">02 — Search</div>
          <SearchBar
            onSearch={search}
            onCancel={() => {
              cancelSearch();
              toast.info("Search cancelled");
            }}
            isSearching={isSearching}
            canSearch={canSearch}
            options={searchOptions}
            onOptionsChange={setSearchOptions}
            recentSearches={recentSearches}
          />
          {isSearching && progress && (
            <SearchProgress progress={progress} filesTotal={files.length} />
          )}
        </section>

        {/* 03 — Results */}
        {showResults && (
          <section className="space-y-4 animate-slide-in">
            <div className="flex items-center justify-between gap-4">
              <div className="section-label flex-1" style={{ marginBottom: 0 }}>
                03 — Results
              </div>
              {hasMatches && (
                <button
                  onClick={exportResults}
                  className="btn-ghost py-1.5 px-3 text-[10px] flex items-center gap-1.5 shrink-0"
                  title="Export all matches as CSV"
                >
                  <Download className="w-3 h-3" />
                  Export CSV
                </button>
              )}
            </div>

            <ResultsSummary searchState={searchState} />

            {hasMatches ? (
              <ErrorBoundary>
                <div className="space-y-2">
                  {searchState.results.map((result, i) => (
                    <ResultCard
                      key={result.fileId}
                      result={result as SearchResult & { error?: string }}
                      query={searchState.query}
                      index={i}
                    />
                  ))}
                </div>
              </ErrorBoundary>
            ) : (
              <EmptyState query={searchState.query} />
            )}
          </section>
        )}

        {/* Privacy badge */}
        <section className="animate-slide-in stagger-4">
          <PrivacyBadge />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between flex-wrap gap-3">
          <span className="font-mono text-xs text-[var(--text-3)]">
            PDFSearch · In-memory processing · No data retained
          </span>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-mono text-[10px] text-[var(--text-3)]">50MB max per file</span>
            <span className="font-mono text-[10px] text-[var(--text-3)]">200 PDFs per session</span>
            <span className="font-mono text-[10px] text-[var(--text-3)]">HTTPS URLs only</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
