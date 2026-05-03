import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "How to Search Across Multiple PDFs Instantly — Free Guide",
  description:
    "Learn how to search across multiple PDF files simultaneously online. Step-by-step guide using free browser-based tools — no software, no signup required.",
  alternates: {
    canonical: "https://www.pdfsearch.info/blog/search-multiple-pdfs-online",
  },
  openGraph: {
    title: "How to Search Across Multiple PDFs Instantly — Free Guide",
    description:
      "Step-by-step: search multiple PDF files at once online. Free, instant, no software needed.",
    url: "https://www.pdfsearch.info/blog/search-multiple-pdfs-online",
  },
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How to Search Across Multiple PDFs Instantly",
  description:
    "Step-by-step guide to searching across multiple PDF files simultaneously using free online tools.",
  author: { "@type": "Organization", name: "PDFSearch" },
  publisher: {
    "@type": "Organization",
    name: "PDFSearch",
    url: "https://www.pdfsearch.info",
  },
  datePublished: "2025-04-15",
  url: "https://www.pdfsearch.info/blog/search-multiple-pdfs-online",
  image: "https://www.pdfsearch.info/opengraph-image",
  mainEntityOfPage: "https://www.pdfsearch.info/blog/search-multiple-pdfs-online",
};

export default function SearchMultiplePdfsBlogPost() {
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
              {["guide", "multiple PDFs", "tutorial"].map((tag) => (
                <span key={tag} className="font-mono text-[9px] uppercase tracking-wider text-[var(--accent)] bg-[var(--surface2)] border border-[var(--border)] px-1.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="font-mono text-3xl sm:text-4xl font-semibold text-[var(--text)] leading-tight mb-4">
              How to Search Across Multiple PDFs Instantly
            </h1>
            <p className="font-sans text-base text-[var(--text-2)] leading-relaxed mb-4">
              Searching dozens of PDF files one by one is slow and error-prone. Here is how to search across all of them simultaneously — for free, with no software to install.
            </p>
            <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--text-3)]">
              <span>April 15, 2025</span>
              <span>·</span>
              <span>5 min read</span>
              <span>·</span>
              <span>PDFSearch</span>
            </div>
          </header>

          <div className="space-y-6 font-sans text-sm text-[var(--text-2)] leading-relaxed">
            <p>
              If you have ever needed to find a specific term across a stack of PDF files, you know how tedious it is to open each one, hit Ctrl+F, search, close, and repeat. For 5 files it is annoying. For 50 files it is practically impossible.
            </p>
            <p>
              The solution is a tool that searches <em>all</em> your PDFs at once — with a single query. Here is exactly how to do it.
            </p>

            <h2 className="font-mono text-xl font-semibold text-[var(--text)] mt-8">
              The problem with searching PDFs one by one
            </h2>
            <p>
              Standard PDF viewers like Adobe Acrobat, browser-embedded viewers, and Preview (macOS) only search within the currently open file. This means:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You have to open and search each file manually</li>
              <li>You can miss results if a file is renamed or in a subfolder</li>
              <li>There is no way to see which files <em>don&apos;t</em> contain a term</li>
              <li>Exporting results requires copy-pasting manually</li>
            </ul>
            <p>
              For any serious research, legal review, compliance audit, or document analysis work, this is unacceptably slow.
            </p>

            <h2 className="font-mono text-xl font-semibold text-[var(--text)] mt-8">
              How to search multiple PDFs at once — step by step
            </h2>

            <div className="card p-5 space-y-3">
              <div className="flex gap-3 items-start">
                <span className="font-mono text-[var(--accent)] font-bold text-base shrink-0 w-6">1.</span>
                <div>
                  <h3 className="font-mono text-sm font-semibold text-[var(--text)] mb-1">Go to pdfsearch.info</h3>
                  <p className="text-xs">Open PDFSearch in any modern browser — Chrome, Firefox, Safari, or Edge. No signup, no download, no extension required.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="font-mono text-[var(--accent)] font-bold text-base shrink-0 w-6">2.</span>
                <div>
                  <h3 className="font-mono text-sm font-semibold text-[var(--text)] mb-1">Load all your PDFs</h3>
                  <p className="text-xs">Select all PDF files and drag them onto the upload zone — or select them with the file picker. You can load up to 200 PDFs at a time. You can also paste PDF URLs from the internet.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="font-mono text-[var(--accent)] font-bold text-base shrink-0 w-6">3.</span>
                <div>
                  <h3 className="font-mono text-sm font-semibold text-[var(--text)] mb-1">Type your search query</h3>
                  <p className="text-xs">Enter the word or phrase you want to find. PDFSearch searches the full text of every loaded PDF simultaneously. Use the case-sensitive or whole-word options if needed.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="font-mono text-[var(--accent)] font-bold text-base shrink-0 w-6">4.</span>
                <div>
                  <h3 className="font-mono text-sm font-semibold text-[var(--text)] mb-1">Review results grouped by file</h3>
                  <p className="text-xs">Results appear grouped by document with match counts and page numbers. You immediately see which files contain your term and how many times. Export all matches as CSV if needed.</p>
                </div>
              </div>
            </div>

            <h2 className="font-mono text-xl font-semibold text-[var(--text)] mt-8">
              Practical use cases
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  title: "Legal & contracts",
                  desc: "Search a contract folder for specific clauses, parties, or dates. Find any obligation across your entire document set.",
                },
                {
                  title: "Academic research",
                  desc: "Search a library of papers for a specific citation, author, methodology, or term. Cross-reference sources instantly.",
                },
                {
                  title: "Compliance audits",
                  desc: "Check that required terms, policy language, or regulatory references appear consistently across policy documents.",
                },
                {
                  title: "Business intelligence",
                  desc: "Search annual reports, earnings calls, and market research for competitor mentions, financial metrics, or trends.",
                },
              ].map((uc) => (
                <div key={uc.title} className="card p-4">
                  <h3 className="font-mono text-xs font-semibold text-[var(--text)] mb-1">{uc.title}</h3>
                  <p className="font-sans text-xs text-[var(--text-2)]">{uc.desc}</p>
                </div>
              ))}
            </div>

            <h2 className="font-mono text-xl font-semibold text-[var(--text)] mt-8">
              Privacy & security
            </h2>
            <p>
              PDFSearch processes all files entirely in your browser using JavaScript. Your PDF files are never uploaded to any server — they stay on your device. This is particularly important for confidential documents like legal contracts, financial reports, or medical records.
            </p>

            <h2 className="font-mono text-xl font-semibold text-[var(--text)] mt-8">
              Tips for better multi-PDF search
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-[var(--text)]">Use whole-word matching</strong> to avoid false positives — e.g., searching for &quot;act&quot; won&apos;t match &quot;contact&quot; or &quot;extract&quot;.</li>
              <li><strong className="text-[var(--text)]">Load URLs</strong> for online PDFs (government reports, academic papers, company filings) without downloading.</li>
              <li><strong className="text-[var(--text)]">Export to CSV</strong> after each search to build a record of findings across your document collection.</li>
              <li><strong className="text-[var(--text)]">Run multiple searches</strong> without re-uploading — loaded PDFs stay in session until you clear them.</li>
            </ul>

            <div className="card p-6 mt-8 text-center">
              <h2 className="font-mono text-base font-semibold text-[var(--text)] mb-2">
                Try it now — search multiple PDFs for free
              </h2>
              <p className="font-sans text-xs text-[var(--text-2)] mb-4">
                No account, no download, no waiting. Load your PDFs and start searching.
              </p>
              <Link href="/" className="btn-primary inline-flex items-center gap-2 py-2.5 px-5 font-mono text-xs font-semibold">
                Search My PDFs
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
            <Link href="/search-multiple-pdfs" className="font-mono text-[10px] text-[var(--text-3)]">Search Multiple PDFs</Link>
            <Link href="/how-to-search-pdf" className="font-mono text-[10px] text-[var(--text-3)]">How to Search PDF</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
