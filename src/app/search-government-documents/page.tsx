import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/LandingPageShell";
import { absUrl, breadcrumbSchema, faqSchema } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Search Government Documents \u2014 FOIA Releases & Records",
  description: "Search FOIA releases, public records, and government filings for names, terms, and figures. Free, private full-text PDF search \u2014 nothing uploaded, handles long releases, no account.",
  alternates: { canonical: absUrl("/search-government-documents") },
  openGraph: {
    title: "Search Government Documents \u2014 FOIA Releases & Records",
    description: "Search FOIA releases and public records for names and terms \u2014 privately, across long documents, nothing uploaded.",
    url: absUrl("/search-government-documents"),
  },
};

const pageFaqSchema = faqSchema([
    { question: "Can I search a long FOIA release?", answer: "Yes. Releases of several hundred pages search in seconds because the work happens locally in your browser. Each file can be up to 50 MB." },
    { question: "Can I search across a multi-file release?", answer: "Yes. Load the whole release \u2014 up to 200 files \u2014 and run one query; results group by document so you can see which files mention a name or term." },
    { question: "Why do some government PDFs return no matches?", answer: "Because they\u2019re scanned images without an OCR text layer. Search for a word you can see on the page \u2014 no match means that file is image-only and needs OCR first." },
    { question: "Are the records kept private?", answer: "Yes. Documents are parsed in your browser and never uploaded, so sensitive public-records material stays on your device \u2014 important for journalists and researchers." },
    { question: "Can I match a name exactly?", answer: "Yes. Whole-word and case-sensitive search let you match a specific name or defined term precisely without catching unrelated words." },
]);

const pageBreadcrumb = breadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Government Documents", path: "/search-government-documents" },
]);

export default function SearchGovernmentDocumentsPage() {
  return (
    <LandingPageShell
      headline="Search Government Documents & Public Records"
      subheadline="Search FOIA releases, filings, and public records for a name, term, or figure \u2014 across long documents, privately."
      description="Search FOIA releases, public records, and government filings for names, terms, and figures. Free, private full-text PDF search \u2014 nothing uploaded, handles long releases, no account."
      breadcrumbLabel="Government Documents"
      benefits={[
        "Search long FOIA releases fast",
        "Find names and terms exactly",
        "Handles mixed native/scanned files",
        "Private \u2014 nothing uploaded",
      ]}
      trustSignals={[
        { title: "Built for public records", desc: "The tool\u2019s original use case \u2014 long official documents" },
        { title: "Name & term search", desc: "Whole-word matching for names and defined terms" },
        { title: "Local & private", desc: "Records are parsed in your browser, never uploaded" },
      ]}
      useCaseSection={
        <section aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-4">
            Searching a document dump for what matters
          </h2>
          <div className="font-sans text-sm text-[var(--text-2)] leading-relaxed space-y-4 max-w-3xl">
            <p>Public-records work was where this tool started. FOIA releases, agency filings, council packets, and voter or property records tend to arrive as long PDFs — sometimes hundreds of pages — and the task is almost always “find every mention of this name, address, or term.” It’s a search problem at heart, and doing it a page at a time doesn’t scale to a document dump.</p>
            <p>Load the release and search once: every occurrence of a name or term comes back with page numbers, so you can cite the exact page in a report or request. Whole-word matching keeps a surname from matching an unrelated common word. Across a multi-file release, <Link href="/bulk-pdf-search" className="text-[var(--accent)] hover:underline">bulk PDF search</Link> tells you in one pass which documents mention what.</p>
            <p>Two honest realities of government PDFs. First, many are scans — some with an OCR text layer, some without — so a release can be a mix of searchable and image-only pages; <Link href="/search-scanned-pdf" className="text-[var(--accent)] hover:underline">the text-layer test</Link> tells you which is which. Second, because everything is parsed in your browser and never uploaded, sensitive records stay on your machine, which matters for journalists and researchers handling them.</p>
          </div>
        </section>
      }
      howToSteps={[
        {
          title: "Load the release or records",
          desc: "Drag the FOIA release, filings, or record set onto the upload zone. Long documents and multi-file releases are both fine.",
        },
        {
          title: "Search a name or term",
          desc: "Type the name, address, or keyword. Use whole-word mode so a surname doesn\u2019t match an unrelated common word.",
        },
        {
          title: "Find every mention",
          desc: "Results group by document with page numbers and context, so you can cite the exact page in a report or follow-up request.",
        },
        {
          title: "Export the findings",
          desc: "Download all matches to CSV \u2014 document, page, excerpt \u2014 for reporting, a records log, or a research dataset.",
        },
      ]}
      faqItems={[
        {
          question: "Can I search a long FOIA release?",
          answer: "Yes. Releases of several hundred pages search in seconds because the work happens locally in your browser. Each file can be up to 50 MB.",
        },
        {
          question: "Can I search across a multi-file release?",
          answer: "Yes. Load the whole release \u2014 up to 200 files \u2014 and run one query; results group by document so you can see which files mention a name or term.",
        },
        {
          question: "Why do some government PDFs return no matches?",
          answer: "Because they\u2019re scanned images without an OCR text layer. Search for a word you can see on the page \u2014 no match means that file is image-only and needs OCR first.",
        },
        {
          question: "Are the records kept private?",
          answer: "Yes. Documents are parsed in your browser and never uploaded, so sensitive public-records material stays on your device \u2014 important for journalists and researchers.",
        },
        {
          question: "Can I match a name exactly?",
          answer: "Yes. Whole-word and case-sensitive search let you match a specific name or defined term precisely without catching unrelated words.",
        },
      ]}
      relatedTools={[
        { href: "/search-scanned-pdf", title: "Search Scanned PDFs", description: "Handle the scanned pages in a release." },
        { href: "/bulk-pdf-search", title: "Bulk PDF Search", description: "See which documents in a release mention a term." },
        { href: "/pdf-search-for-lawyers", title: "PDF Search for Lawyers", description: "Confidential search for legal records." },
      ]}
      relatedArticles={[
        { href: "/blog/how-to-search-scanned-pdfs", title: "How to Search Scanned PDFs", description: "Making image-only releases searchable." },
        { href: "/blog/best-pdf-search-tools", title: "Best PDF Search Tools", description: "Options for public-records research." },
      ]}
      schemaMarkup={[pageFaqSchema, pageBreadcrumb]}
    />
  );
}
