import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/LandingPageShell";

export const metadata: Metadata = {
  title: "Bulk PDF Search — Search a Whole Folder or Archive of PDFs",
  description:
    "Search an entire folder or archive of PDFs in one pass. Load up to 200 documents by file or URL pattern, then run one query across every page — built for batch review workflows.",
  alternates: {
    canonical: "https://www.pdfsearch.info/bulk-pdf-search",
  },
  openGraph: {
    title: "Bulk PDF Search — Search a Whole Folder or Archive of PDFs",
    description:
      "Batch-search an entire folder or numbered URL range of PDFs in one pass. Free, instant, 100% private.",
    url: "https://www.pdfsearch.info/bulk-pdf-search",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pdfsearch.info" },
    { "@type": "ListItem", position: 2, name: "Bulk PDF Search", item: "https://www.pdfsearch.info/bulk-pdf-search" },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I search across a large number of PDF files?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "With PDFSearch, you can upload up to 200 PDF files and search across all of them simultaneously. Load your entire PDF collection, type your query, and get results from all documents in seconds.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a tool to search through thousands of PDFs?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PDFSearch supports up to 200 PDFs per session and searches all of them simultaneously. For very large archives (thousands of files), you can run multiple sessions.",
      },
    },
  ],
};

export default function BulkPdfSearchPage() {
  return (
    <LandingPageShell
      headline="Bulk PDF Search — Batch-Search an Entire Folder"
      subheadline="Built for batch workflows: load a whole folder, or a numbered range of URLs, and work through the results in one pass."
      description="Bulk search is a different job from searching a handful of files. It means getting a whole archive in at once — a folder of contracts, a numbered run of filings, a scanned record series — then working through the results systematically. PDFSearch handles the loading (select a folder, or generate a numbered URL range), the scale (up to 200 documents per pass), and the export (CSV of every match with its page number)."
      benefits={[
        "Up to 200 PDFs per session",
        "Parallel search processing",
        "Results grouped by document",
        "CSV export for all matches",
      ]}
      howToSteps={[
        {
          title: "Select all your PDF files",
          desc: "Drag your entire PDF folder onto the PDFSearch upload zone. All files are loaded simultaneously — you can also mix in PDF URLs from the internet.",
        },
        {
          title: "Run your search query",
          desc: "Type your keyword, phrase, or identifier. PDFSearch processes all PDFs in parallel — a collection of 50 documents typically searches in under 10 seconds.",
        },
        {
          title: "Filter by document",
          desc: "Results are grouped by file so you can immediately see which documents in your collection contain your search term and how many times.",
        },
        {
          title: "Export all matches to CSV",
          desc: "Download every match across all documents as a CSV with file names, page numbers, and text excerpts — ready for reporting or further analysis.",
        },
      ]}
      faqItems={[
        {
          question: "How many PDFs can I search at once?",
          answer:
            "PDFSearch supports up to 200 PDF files per session. Each file can be up to 50 MB.",
        },
        {
          question: "How fast is bulk PDF search?",
          answer:
            "PDFSearch processes PDFs in parallel — up to 5 concurrent threads in your browser. A collection of 50 average-sized PDFs typically searches in under 10 seconds.",
        },
        {
          question: "Can I search a large archive of PDFs without specialized software?",
          answer:
            "Yes. PDFSearch is a browser-based tool that requires no software installation. Load your PDFs, search, and export results — all in a browser tab.",
        },
        {
          question: "Can I search PDF collections by URL?",
          answer:
            "Yes. Paste multiple PDF URLs (one per line) and PDFSearch will fetch and search all of them. Ideal for searching online document repositories.",
        },
        {
          question: "What happens when I search a large PDF collection?",
          answer:
            "PDFSearch shows a real-time progress bar as it processes each file. You can see which document is being searched and how many matches have been found so far.",
        },
      ]}
      breadcrumbLabel="Bulk PDF Search"
      trustSignals={[
        { title: "200 files per pass", desc: "Load an entire folder and search it as one corpus" },
        { title: "Parallel processing", desc: "Five files parsed concurrently, right in your browser" },
        { title: "CSV export built in", desc: "Every match with file, page, and context — one click" },
      ]}
      useCaseSection={
        <section aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-4">
            Built for batch jobs, not one-off lookups
          </h2>
          <div className="font-sans text-sm text-[var(--text-2)] leading-relaxed space-y-4 max-w-3xl">
            <p>Bulk search matters most when the answer could be in any of dozens of files: a compliance officer confirming a clause was removed from every contract in a folder, an auditor tracing an invoice number through a year of statements, or a records clerk checking which of 80 scanned releases mention a specific name. Opening files one by one doesn’t just waste time — it invites misses.</p>
            <p>PDFSearch treats the whole batch as a single searchable corpus. Results come back grouped by document with page numbers, so “which files mention X” is answered at a glance. If you routinely work with just a handful of files instead, the lighter <Link href="/search-multiple-pdfs" className="text-[var(--accent)] hover:underline">multi-PDF search</Link> workflow may fit better; for one long document, see <Link href="/how-to-search-pdf" className="text-[var(--accent)] hover:underline">how to search a PDF</Link>.</p>
            <p>Batches of confidential documents never leave your machine — parsing happens in your browser, which is why legal teams use it for <Link href="/pdf-search-for-lawyers" className="text-[var(--accent)] hover:underline">discovery and contract review</Link> without a vendor agreement.</p>
          </div>
        </section>
      }
      relatedTools={[
        { href: "/search-multiple-pdfs", title: "Search Multiple PDFs", description: "Searching a handful of files rather than a whole archive? Start here." },
        { href: "/free-pdf-search-engine", title: "Free PDF Search Engine", description: "A private search engine for your own document library." },
        { href: "/pdf-search-for-lawyers", title: "PDF Search for Lawyers", description: "Search discovery batches and contracts confidentially." },
      ]}
      relatedArticles={[
        { href: "/blog/search-multiple-pdfs-online", title: "How to Search Multiple PDFs Online", description: "Step-by-step tutorial for batch searching." },
        { href: "/blog/best-pdf-search-tools", title: "Best PDF Search Tools", description: "An honest comparison of the options." },
      ]}
      schemaMarkup={[faqSchema, breadcrumbSchema]}
    />
  );
}
