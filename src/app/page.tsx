"use client";

import { useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { ShieldCheck, Download, Keyboard, Zap, Lock, FileText, Search, Globe, CheckCircle } from "lucide-react";
import { UploadZone } from "@/components/upload/UploadZone";
import { UrlInput } from "@/components/upload/UrlInput";
import { SearchBar } from "@/components/search/SearchBar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useSearchEngine } from "@/hooks/useSearchEngine";
import { useUserHistory } from "@/hooks/useUserHistory";
import { useToast } from "@/components/ui/Toast";
import type { SearchResult } from "@/types";

// Lazy-load below-fold and conditional components to reduce initial bundle / TBT
const FileList = dynamic(() => import("@/components/upload/FileList").then(m => ({ default: m.FileList })));
const QuickLoad = dynamic(() => import("@/components/upload/QuickLoad").then(m => ({ default: m.QuickLoad })));
const SearchProgress = dynamic(() => import("@/components/search/SearchProgress").then(m => ({ default: m.SearchProgress })));
const ResultCard = dynamic(() => import("@/components/search/ResultCard").then(m => ({ default: m.ResultCard })));
const ResultsSummary = dynamic(() => import("@/components/search/ResultsSummary").then(m => ({ default: m.ResultsSummary })));
const PrivacyBadge = dynamic(() => import("@/components/ui/PrivacyBadge").then(m => ({ default: m.PrivacyBadge })));
const EmptyState = dynamic(() => import("@/components/ui/EmptyState").then(m => ({ default: m.EmptyState })));

const faqs = [
  {
    question: "How do I search text inside a PDF?",
    answer:
      "Upload your PDF file using the drag-and-drop zone or paste a PDF URL. Then type any word or phrase in the search box and click Search. PDFSearch will scan every page and highlight all matching text instantly.",
  },
  {
    question: "Can I search across multiple PDF files at once?",
    answer:
      "Yes. You can load up to 200 PDF files simultaneously — by uploading files or pasting URLs — and search all of them with a single query. Results are grouped by file so you can quickly see which documents contain your search term.",
  },
  {
    question: "Is PDFSearch free to use?",
    answer:
      "PDFSearch is completely free. No account, no subscription, no hidden fees. Upload PDFs and search instantly with no limitations beyond browser memory.",
  },
  {
    question: "Are my PDF files stored on your servers?",
    answer:
      "No. All processing happens entirely in your browser using client-side JavaScript. Your files are never uploaded to any server, never stored, and never leave your device. PDFSearch is 100% private.",
  },
  {
    question: "What is the maximum PDF file size?",
    answer:
      "Each PDF file can be up to 50 MB. You can load up to 200 PDFs per session. Large files are processed page by page to stay within browser memory limits.",
  },
  {
    question: "Can I search scanned PDFs?",
    answer:
      "PDFSearch works with text-layer PDFs. Scanned PDFs that are purely image-based require OCR (optical character recognition) to extract text. If your scanned PDF was saved with an embedded text layer, it will work perfectly.",
  },
  {
    question: "Does PDFSearch support case-sensitive search?",
    answer:
      "Yes. Toggle the case-sensitive option in the search bar to match exact capitalization. You can also enable whole-word matching to find standalone words rather than substrings.",
  },
  {
    question: "Can I search PDFs from a URL without downloading them?",
    answer:
      "Yes. Paste any public HTTPS PDF URL into the URL input field. PDFSearch will fetch the PDF through a secure proxy and search it — no manual download needed.",
  },
];

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

  useEffect(() => {
    if (searchState.status === "error" && searchState.error) {
      toast.error(`Search error: ${searchState.error}`);
    }
  }, [searchState.status, searchState.error, toast]);

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

          <nav aria-label="Site navigation" className="flex items-center gap-4">
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
          </nav>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Hero */}
        <section aria-labelledby="hero-heading" className="animate-slide-in stagger-1">
          <h1 id="hero-heading" className="font-mono text-3xl sm:text-4xl lg:text-5xl font-semibold leading-[1.05] tracking-tight text-[var(--text)] mb-3">
            Search inside{" "}
            <span className="text-[var(--accent)]">any PDF</span>
            <br />
            instantly. Free.
          </h1>
          <p className="font-sans text-sm text-[var(--text-2)] max-w-xl leading-relaxed mb-4">
            The best free PDF search tool online. Upload files or paste URLs — search across{" "}
            <strong className="text-[var(--text)]">hundreds of PDFs simultaneously</strong> with
            full-text search. 100% private: nothing ever leaves your browser.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "No signup required",
              "Up to 200 PDFs at once",
              "50 MB per file",
              "100% browser-based",
            ].map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--text-2)] bg-[var(--surface)] border border-[var(--border)] px-2 py-1"
              >
                <CheckCircle className="w-3 h-3 text-[var(--green)]" />
                {badge}
              </span>
            ))}
          </div>
        </section>

        {/* 01 — Load PDFs */}
        <section aria-labelledby="load-heading" className="space-y-3 animate-slide-in stagger-2">
          <div className="section-label" id="load-heading">01 — Load PDFs</div>
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
          <section aria-label="Loaded PDF files" className="animate-slide-in">
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
        <section aria-labelledby="search-heading" className="space-y-3 animate-slide-in stagger-3">
          <div className="section-label" id="search-heading">02 — Search</div>
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
          <section aria-labelledby="results-heading" className="space-y-4 animate-slide-in">
            <div className="flex items-center justify-between gap-4">
              <div className="section-label flex-1" id="results-heading" style={{ marginBottom: 0 }}>
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

        {/* ── Features Section ── */}
        <section aria-labelledby="features-heading" className="animate-slide-in stagger-4 pt-4">
          <h2 id="features-heading" className="font-mono text-xl font-semibold text-[var(--text)] mb-6">
            Why PDFSearch is the best PDF search tool
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: <Zap className="w-4 h-4 text-[var(--accent)]" />,
                title: "Instant full-text search",
                desc: "Search across all your PDFs simultaneously. Find any word or phrase in milliseconds, with results highlighted in context.",
              },
              {
                icon: <Lock className="w-4 h-4 text-[var(--green)]" />,
                title: "100% private & secure",
                desc: "All PDF processing happens entirely in your browser. Your files never touch our servers — complete privacy guaranteed.",
              },
              {
                icon: <FileText className="w-4 h-4 text-[var(--blue)]" />,
                title: "Search multiple PDFs at once",
                desc: "Load up to 200 PDF files in a single session and run one search across all of them. No other tool does it faster.",
              },
              {
                icon: <Globe className="w-4 h-4 text-[var(--accent)]" />,
                title: "Search PDFs by URL",
                desc: "Paste any public PDF URL and search it directly — no downloading needed. Perfect for research papers, reports, and documentation.",
              },
              {
                icon: <Search className="w-4 h-4 text-[var(--green)]" />,
                title: "Advanced search options",
                desc: "Case-sensitive search, whole-word matching, and search context display. Get precise results every time.",
              },
              {
                icon: <Download className="w-4 h-4 text-[var(--blue)]" />,
                title: "Export results as CSV",
                desc: "Download all matches with page numbers and context as a CSV file. Perfect for research, compliance, and document review.",
              },
            ].map((f) => (
              <div key={f.title} className="card p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {f.icon}
                  <h3 className="font-mono text-sm font-semibold text-[var(--text)]">{f.title}</h3>
                </div>
                <p className="font-sans text-xs text-[var(--text-2)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How To Use Section ── */}
        <section aria-labelledby="howto-heading" className="animate-slide-in pt-4">
          <h2 id="howto-heading" className="font-mono text-xl font-semibold text-[var(--text)] mb-2">
            How to search text inside a PDF — 3 simple steps
          </h2>
          <p className="font-sans text-xs text-[var(--text-2)] mb-6 leading-relaxed">
            PDFSearch is the fastest way to search words in a PDF online. No software to install,
            no account required.
          </p>
          <ol className="space-y-4">
            {[
              {
                step: "01",
                title: "Load your PDFs",
                desc: "Drag and drop PDF files into the upload zone, or paste public PDF URLs. You can add up to 200 PDFs simultaneously — mix files and URLs freely.",
              },
              {
                step: "02",
                title: "Type your search query",
                desc: 'Enter any word, phrase, or number in the search box. Use advanced options to enable case-sensitive search or whole-word matching for more precise results.',
              },
              {
                step: "03",
                title: "Browse highlighted results",
                desc: "Results appear instantly, grouped by file with page numbers and highlighted context. Export all matches as CSV for further analysis.",
              },
            ].map((s) => (
              <li key={s.step} className="flex gap-4 items-start">
                <span className="font-mono text-[var(--accent)] text-sm font-bold shrink-0 w-7 mt-0.5">
                  {s.step}
                </span>
                <div>
                  <h3 className="font-mono text-sm font-semibold text-[var(--text)] mb-1">{s.title}</h3>
                  <p className="font-sans text-xs text-[var(--text-2)] leading-relaxed">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Use Cases Section ── */}
        <section aria-labelledby="usecases-heading" className="animate-slide-in pt-4">
          <h2 id="usecases-heading" className="font-mono text-xl font-semibold text-[var(--text)] mb-6">
            Who uses PDFSearch?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: "Researchers & academics",
                desc: "Search across hundreds of research papers and journals simultaneously. Find specific citations, data, or methodology mentions across your entire PDF library.",
              },
              {
                title: "Legal & compliance teams",
                desc: "Search contracts, filings, and regulatory documents instantly. Find specific clauses, dates, or terms across large document sets without opening each file.",
              },
              {
                title: "Students",
                desc: "Search your textbooks, lecture notes, and study materials at once. Find any concept or definition across multiple PDF course materials instantly.",
              },
              {
                title: "Business analysts",
                desc: "Search annual reports, market research, and internal documents. Cross-reference information across multiple PDF sources in seconds.",
              },
            ].map((uc) => (
              <div key={uc.title} className="card p-4">
                <h3 className="font-mono text-sm font-semibold text-[var(--text)] mb-2">{uc.title}</h3>
                <p className="font-sans text-xs text-[var(--text-2)] leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ Section ── */}
        <section aria-labelledby="faq-heading" className="animate-slide-in pt-4">
          <h2 id="faq-heading" className="font-mono text-xl font-semibold text-[var(--text)] mb-6">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.question} className="card p-4 group">
                <summary className="font-mono text-sm font-semibold text-[var(--text)] cursor-pointer list-none flex items-start justify-between gap-3">
                  <span>{faq.question}</span>
                  <span className="text-[var(--accent)] shrink-0 mt-0.5 text-base leading-none select-none">+</span>
                </summary>
                <p className="font-sans text-xs text-[var(--text-2)] leading-relaxed mt-3">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between flex-wrap gap-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-[var(--accent)] flex items-center justify-center">
                  <span className="font-mono text-[9px] font-bold text-black">PDF</span>
                </div>
                <span className="font-mono text-sm font-semibold text-[var(--text)]">
                  PDFSearch
                </span>
              </div>
              <p className="font-sans text-xs text-[var(--text-3)] max-w-xs leading-relaxed">
                The best free PDF search engine online. Search text inside any PDF instantly,
                privately, and without installing any software.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-mono text-[10px] text-[var(--text-3)] font-semibold uppercase tracking-wider mb-2">Limits</p>
              <p className="font-mono text-[10px] text-[var(--text-3)]">50 MB max per file</p>
              <p className="font-mono text-[10px] text-[var(--text-3)]">200 PDFs per session</p>
              <p className="font-mono text-[10px] text-[var(--text-3)]">HTTPS URLs only</p>
            </div>
            <div className="space-y-1">
              <p className="font-mono text-[10px] text-[var(--text-3)] font-semibold uppercase tracking-wider mb-2">Features</p>
              <p className="font-mono text-[10px] text-[var(--text-3)]">Full-text PDF search</p>
              <p className="font-mono text-[10px] text-[var(--text-3)]">Search multiple PDFs</p>
              <p className="font-mono text-[10px] text-[var(--text-3)]">Search PDF by URL</p>
              <p className="font-mono text-[10px] text-[var(--text-3)]">Export results as CSV</p>
            </div>
          </div>
          <div className="border-t border-[var(--border)] pt-4 flex items-center justify-between flex-wrap gap-3">
            <span className="font-mono text-[10px] text-[var(--text-3)]">
              © {new Date().getFullYear()} PDFSearch · In-memory processing · No data retained
            </span>
            <span className="font-mono text-[10px] text-[var(--text-3)]">
              Free online PDF search tool
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
