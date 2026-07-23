import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/LandingPageShell";
import { absUrl, breadcrumbSchema, faqSchema } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "PDF Search for Researchers \u2014 Search Papers & Literature",
  description: "Search across dozens of research papers at once for methods, datasets, and citations. Free, private full-text PDF search for literature reviews \u2014 export matches to CSV, nothing uploaded.",
  alternates: { canonical: absUrl("/pdf-search-for-researchers") },
  openGraph: {
    title: "PDF Search for Researchers \u2014 Search Papers & Literature",
    description: "Search your literature-review corpus for methods, datasets, and citations across every paper at once.",
    url: absUrl("/pdf-search-for-researchers"),
  },
};

const pageFaqSchema = faqSchema([
    { question: "Can I search across many papers at once?", answer: "Yes. Load up to 200 PDFs and run a single query across all of them; results are grouped by paper with page numbers so you can see which sources match." },
    { question: "Does it handle two-column academic PDFs?", answer: "Yes. Search runs on the text extracted from the PDF, so multi-column layouts, footnotes, and endnotes are all searchable as long as the PDF has a real text layer." },
    { question: "Can I export search results?", answer: "Yes. Every match can be exported to CSV with the file name, page number, and surrounding text \u2014 useful for building a synthesis matrix or evidence table." },
    { question: "Are my unpublished manuscripts kept private?", answer: "Yes. PDFs are parsed inside your browser and never uploaded, so embargoed preprints and unpublished drafts stay entirely on your device." },
    { question: "What about scanned or older papers?", answer: "Scanned papers need an OCR text layer to be searchable. Load one and search for a visible word \u2014 no matches means it\u2019s image-only and needs OCR first." },
]);

const pageBreadcrumb = breadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "For Researchers", path: "/pdf-search-for-researchers" },
]);

export default function PdfSearchForResearchersPage() {
  return (
    <LandingPageShell
      headline="PDF Search for Researchers & Academics"
      subheadline="Search a whole literature corpus at once \u2014 find every mention of a method, dataset, or citation across dozens of papers."
      description="Search across dozens of research papers at once for methods, datasets, and citations. Free, private full-text PDF search for literature reviews \u2014 export matches to CSV, nothing uploaded."
      breadcrumbLabel="For Researchers"
      benefits={[
        "Search dozens of papers at once",
        "Handles dense academic layouts",
        "Export matches to CSV",
        "Private \u2014 no uploads to a server",
      ]}
      trustSignals={[
        { title: "Corpus-wide search", desc: "Load your whole reading list and query it as one" },
        { title: "Citation & method hunting", desc: "Trace a term or reference across every paper" },
        { title: "Reproducible exports", desc: "CSV of matches with file and page for your notes" },
      ]}
      useCaseSection={
        <section aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-4">
            Literature review as a search problem
          </h2>
          <div className="font-sans text-sm text-[var(--text-2)] leading-relaxed space-y-4 max-w-3xl">
            <p>A literature review is a search problem in disguise. Once you have thirty or forty PDFs, the real questions are cross-cutting: which papers used this instrument, who cited that dataset, where does this term first appear across the set. Reading each PDF’s own find box, one file at a time, is how citations get missed.</p>
            <p>PDFSearch treats your corpus as one searchable body. Query a method name or author once and get every hit grouped by paper with page numbers — then export the lot to CSV to drop straight into your notes or a synthesis matrix. Two-column academic layouts and footnote-heavy pages are handled, since search runs on the extracted text rather than the visual layout. For the mechanics of searching many files together, <Link href="/search-multiple-pdfs" className="text-[var(--accent)] hover:underline">search multiple PDFs</Link> covers the workflow.</p>
            <p>Unpublished manuscripts and preprints under embargo never leave your machine — parsing is in-browser. The one limit to know: a scanned PDF of an older paper needs OCR before its text is searchable (<Link href="/search-scanned-pdf" className="text-[var(--accent)] hover:underline">how to tell</Link>).</p>
          </div>
        </section>
      }
      howToSteps={[
        {
          title: "Load your reading list",
          desc: "Drop every PDF in your review \u2014 up to 200 \u2014 onto the upload zone, or paste links to open-access papers.",
        },
        {
          title: "Search a method or citation",
          desc: "Type the instrument, dataset, author, or term. Use whole-word mode to avoid partial matches in dense text.",
        },
        {
          title: "Scan hits across papers",
          desc: "Results group by paper with page numbers and surrounding text, so you see at a glance which sources are relevant.",
        },
        {
          title: "Export for synthesis",
          desc: "Download all matches as CSV \u2014 file, page, and excerpt \u2014 ready for a synthesis matrix or reference manager notes.",
        },
      ]}
      faqItems={[
        {
          question: "Can I search across many papers at once?",
          answer: "Yes. Load up to 200 PDFs and run a single query across all of them; results are grouped by paper with page numbers so you can see which sources match.",
        },
        {
          question: "Does it handle two-column academic PDFs?",
          answer: "Yes. Search runs on the text extracted from the PDF, so multi-column layouts, footnotes, and endnotes are all searchable as long as the PDF has a real text layer.",
        },
        {
          question: "Can I export search results?",
          answer: "Yes. Every match can be exported to CSV with the file name, page number, and surrounding text \u2014 useful for building a synthesis matrix or evidence table.",
        },
        {
          question: "Are my unpublished manuscripts kept private?",
          answer: "Yes. PDFs are parsed inside your browser and never uploaded, so embargoed preprints and unpublished drafts stay entirely on your device.",
        },
        {
          question: "What about scanned or older papers?",
          answer: "Scanned papers need an OCR text layer to be searchable. Load one and search for a visible word \u2014 no matches means it\u2019s image-only and needs OCR first.",
        },
      ]}
      relatedTools={[
        { href: "/search-multiple-pdfs", title: "Search Multiple PDFs", description: "One query across your whole corpus." },
        { href: "/bulk-pdf-search", title: "Bulk PDF Search", description: "Folder-scale search with CSV export." },
        { href: "/search-text-in-pdf", title: "Search Text in PDF", description: "Exact-match search for terms and identifiers." },
      ]}
      relatedArticles={[
        { href: "/blog/search-multiple-pdfs-online", title: "How to Search Multiple PDFs Online", description: "The batch-search tutorial." },
        { href: "/blog/best-pdf-search-tools", title: "Best PDF Search Tools", description: "How the options compare for research." },
      ]}
      schemaMarkup={[pageFaqSchema, pageBreadcrumb]}
    />
  );
}
