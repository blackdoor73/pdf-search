import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, CheckCircle, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Best Tools to Search Large PDF Collections in 2025",
  description:
    "A practical comparison of the best PDF search tools in 2025 — from browser built-ins to dedicated search engines. Find the right tool for your PDF workflow.",
  alternates: {
    canonical: "https://www.pdfsearch.info/blog/best-pdf-search-tools",
  },
  openGraph: {
    title: "Best Tools to Search Large PDF Collections in 2025",
    description:
      "Practical comparison of the best PDF search tools in 2025. Find the right tool for searching single or multiple PDF files.",
    url: "https://www.pdfsearch.info/blog/best-pdf-search-tools",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Best Tools to Search Large PDF Collections in 2025",
  description:
    "A practical comparison of the best tools for searching inside and across PDF files in 2025.",
  author: { "@type": "Organization", name: "PDFSearch" },
  publisher: { "@type": "Organization", name: "PDFSearch", url: "https://www.pdfsearch.info" },
  datePublished: "2025-04-01",
  url: "https://www.pdfsearch.info/blog/best-pdf-search-tools",
  image: "https://www.pdfsearch.info/opengraph-image",
};

const tools = [
  {
    name: "PDFSearch",
    url: "pdfsearch.info",
    summary: "Free browser-based tool designed for searching across multiple PDFs simultaneously.",
    pros: [
      "Search up to 200 PDFs at once",
      "Works with file uploads and URLs",
      "100% private — no server upload",
      "Free with no account required",
      "Export results as CSV",
    ],
    cons: [
      "Browser memory limits large collections",
      "Requires text-layer PDFs (no OCR)",
    ],
    bestFor: "Multi-document search, research, legal review, compliance",
    cost: "Free",
    recommended: true,
  },
  {
    name: "Adobe Acrobat",
    url: "adobe.com/acrobat",
    summary: "Industry-standard PDF software with advanced search including full-text indexing.",
    pros: [
      "Catalog-based search across folders",
      "OCR for scanned documents",
      "Advanced search filters",
      "Works offline",
    ],
    cons: [
      "Paid subscription (~$15-23/mo)",
      "Requires software installation",
      "Indexing takes time for large collections",
    ],
    bestFor: "Enterprise, legal, high-volume document processing",
    cost: "$15–23/mo",
    recommended: false,
  },
  {
    name: "Browser Ctrl+F",
    url: "",
    summary: "Built-in find in any browser or PDF reader. Best for searching a single open file.",
    pros: [
      "No setup needed",
      "Works instantly",
      "Available everywhere",
    ],
    cons: [
      "One file at a time only",
      "No export",
      "No search context shown",
    ],
    bestFor: "Quick search in a single PDF you already have open",
    cost: "Free",
    recommended: false,
  },
  {
    name: "Google Drive",
    url: "drive.google.com",
    summary: "Cloud storage with OCR-based PDF search. Uploads and indexes PDFs for search.",
    pros: [
      "Free up to 15 GB",
      "Can search scanned PDFs via OCR",
      "Accessible from anywhere",
    ],
    cons: [
      "Files uploaded to Google's servers",
      "Search can miss text in some PDFs",
      "Not designed for bulk multi-PDF queries",
    ],
    bestFor: "Cloud-stored documents where privacy is less critical",
    cost: "Free (15 GB) / $3+/mo",
    recommended: false,
  },
];

export default function BestPdfSearchToolsPost() {
  return (
    <div className="min-h-screen bg-[var(--bg)] grid-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-7 h-7 bg-[var(--accent)] flex items-center justify-center">
              <span className="font-mono text-[10px] font-bold text-black">PDF</span>
            </div>
            <span className="font-mono text-base font-semibold text-[var(--text)]">
              Search<span className="text-[var(--accent)]">.</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--green)]" />
            <span className="hidden sm:inline font-mono text-xs text-[var(--text-3)]">Files never stored</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-2">
          <Link href="/blog" className="font-mono text-[10px] text-[var(--text-3)] hover:text-[var(--accent)]">
            ← Blog
          </Link>
        </div>

        <article>
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {["comparison", "tools", "roundup"].map((tag) => (
                <span key={tag} className="font-mono text-[9px] uppercase tracking-wider text-[var(--accent)] bg-[var(--surface2)] border border-[var(--border)] px-1.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="font-mono text-3xl sm:text-4xl font-semibold text-[var(--text)] leading-tight mb-4">
              Best Tools to Search Large PDF Collections in 2025
            </h1>
            <p className="font-sans text-base text-[var(--text-2)] leading-relaxed mb-4">
              A practical, no-fluff comparison of tools for searching inside PDF documents — whether you have one file or five hundred.
            </p>
            <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--text-3)]">
              <span>April 1, 2025</span>
              <span>·</span>
              <span>7 min read</span>
            </div>
          </header>

          <div className="space-y-6 font-sans text-sm text-[var(--text-2)] leading-relaxed">
            <p>
              PDF remains the dominant format for documents — contracts, research papers, government filings, product manuals, financial reports. And searching inside them effectively depends heavily on which tool you use and how many files you need to search.
            </p>
            <p>
              This guide compares the practical options available in 2025.
            </p>

            <h2 className="font-mono text-xl font-semibold text-[var(--text)] mt-8">
              What to look for in a PDF search tool
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-[var(--text)]">Multi-file support:</strong> Can it search more than one PDF at a time?</li>
              <li><strong className="text-[var(--text)]">Privacy:</strong> Do your files get uploaded to a third-party server?</li>
              <li><strong className="text-[var(--text)]">URL support:</strong> Can it search PDFs from the web without downloading?</li>
              <li><strong className="text-[var(--text)]">Export:</strong> Can you export your search results?</li>
              <li><strong className="text-[var(--text)]">Cost:</strong> Free, subscription, or one-time purchase?</li>
              <li><strong className="text-[var(--text)]">OCR support:</strong> Can it search scanned (image) PDFs?</li>
            </ul>

            <h2 className="font-mono text-xl font-semibold text-[var(--text)] mt-8">
              Tool comparison
            </h2>

            <div className="space-y-5">
              {tools.map((tool) => (
                <div key={tool.name} className={`card p-5 ${tool.recommended ? "border-[var(--accent)] border" : ""}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-mono text-base font-semibold text-[var(--text)]">{tool.name}</h3>
                        {tool.recommended && (
                          <span className="font-mono text-[9px] uppercase tracking-wider text-black bg-[var(--accent)] px-1.5 py-0.5">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="font-sans text-xs text-[var(--text-2)]">{tool.summary}</p>
                    </div>
                    <span className="font-mono text-xs text-[var(--accent)] shrink-0">{tool.cost}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-3)] mb-1">Pros</p>
                      <ul className="space-y-1">
                        {tool.pros.map((p) => (
                          <li key={p} className="flex items-start gap-1.5 font-sans text-xs text-[var(--text-2)]">
                            <CheckCircle className="w-3 h-3 text-[var(--green)] shrink-0 mt-0.5" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-3)] mb-1">Cons</p>
                      <ul className="space-y-1">
                        {tool.cons.map((c) => (
                          <li key={c} className="flex items-start gap-1.5 font-sans text-xs text-[var(--text-2)]">
                            <XCircle className="w-3 h-3 text-[var(--red)] shrink-0 mt-0.5" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <p className="font-mono text-[10px] text-[var(--text-3)]">
                    <span className="text-[var(--text-2)]">Best for:</span> {tool.bestFor}
                  </p>
                </div>
              ))}
            </div>

            <h2 className="font-mono text-xl font-semibold text-[var(--text)] mt-8">
              Our recommendation
            </h2>
            <p>
              For most people who need to search PDF files — especially multiple documents — <strong className="text-[var(--text)]">PDFSearch is the best free option</strong> in 2025. It is the only tool that combines multi-file search, URL support, privacy (no server uploads), and export functionality at no cost.
            </p>
            <p>
              If you regularly work with scanned documents that need OCR, Adobe Acrobat is worth evaluating for its more comprehensive feature set. But for text-layer PDFs, PDFSearch covers the vast majority of use cases.
            </p>

            <div className="card p-6 mt-8 text-center">
              <h2 className="font-mono text-base font-semibold text-[var(--text)] mb-2">
                Try PDFSearch — free, no account required
              </h2>
              <p className="font-sans text-xs text-[var(--text-2)] mb-4">
                Load up to 200 PDFs and search all of them at once in your browser.
              </p>
              <Link href="/" className="btn-primary inline-flex items-center gap-2 py-2.5 px-5 font-mono text-xs font-semibold">
                Search PDFs Free
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </article>
      </main>

      <footer className="border-t border-[var(--border)] mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between flex-wrap gap-3">
          <Link href="/" className="font-mono text-xs text-[var(--text-3)]">PDFSearch · Free PDF Search Tool</Link>
          <div className="flex items-center gap-4">
            <Link href="/blog" className="font-mono text-[10px] text-[var(--text-3)]">Blog</Link>
            <Link href="/free-pdf-search-engine" className="font-mono text-[10px] text-[var(--text-3)]">Free PDF Search Engine</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
