import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/LandingPageShell";
import { absUrl, breadcrumbSchema, faqSchema } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "PDF Search for Lawyers \u2014 Confidential Document Search",
  description: "Search discovery documents, contracts, and deposition transcripts without uploading anything. Free, in-browser PDF search that keeps privileged material confidential \u2014 no vendor, no account.",
  alternates: { canonical: absUrl("/pdf-search-for-lawyers") },
  openGraph: {
    title: "PDF Search for Lawyers \u2014 Confidential Document Search",
    description: "Search discovery, contracts, and transcripts fast \u2014 and keep them confidential, because nothing leaves your browser.",
    url: absUrl("/pdf-search-for-lawyers"),
  },
};

const pageFaqSchema = faqSchema([
    { question: "Is it safe to search privileged documents?", answer: "Yes. PDFSearch parses files entirely inside your browser \u2014 they are never uploaded to any server. Privileged and confidential material stays on your device, so there\u2019s no vendor to trust with it." },
    { question: "Can it handle a 500-page document?", answer: "Yes. Long filings, discovery productions, and transcripts search in seconds because the work happens locally. Each file can be up to 50 MB." },
    { question: "Can I match a defined term exactly?", answer: "Yes. Case-sensitive and whole-word search let you match a defined term like \u201cConfidential Information\u201d precisely without catching unrelated lowercase uses." },
    { question: "Do I need a vendor agreement or DPA?", answer: "No. Because nothing is uploaded or processed on a server, there is no data-processing arrangement to sign \u2014 the tool never receives your files." },
    { question: "Can I search scanned exhibits?", answer: "Only if they have been OCR\u2019d. A raw scan is an image with no searchable text. Load it and search for a visible word to confirm whether a text layer exists." },
]);

const pageBreadcrumb = breadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "For Lawyers", path: "/pdf-search-for-lawyers" },
]);

export default function PdfSearchForLawyersPage() {
  return (
    <LandingPageShell
      headline="Confidential PDF Search for Lawyers"
      subheadline="Search discovery documents, contracts, and transcripts in seconds \u2014 and keep every file confidential, because nothing is ever uploaded."
      description="Search discovery documents, contracts, and deposition transcripts without uploading anything. Free, in-browser PDF search that keeps privileged material confidential \u2014 no vendor, no account."
      breadcrumbLabel="For Lawyers"
      benefits={[
        "Nothing uploaded \u2014 stays privileged",
        "Search 500-page documents fast",
        "Exact defined-term matching",
        "No vendor agreement needed",
      ]}
      trustSignals={[
        { title: "Confidential by design", desc: "Files are parsed in your browser, never sent to a server" },
        { title: "Built for long documents", desc: "A 500-page filing searches as fast as a memo" },
        { title: "Exact terms", desc: "Case-sensitive matching for defined contract terms" },
      ]}
      useCaseSection={
        <section aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-4">
            Search privileged documents without uploading them
          </h2>
          <div className="font-sans text-sm text-[var(--text-2)] leading-relaxed space-y-4 max-w-3xl">
            <p>For legal work, the usual objection to any online tool is the first one that matters: you cannot upload privileged client material to some vendor’s server. That single constraint rules out most “PDF search” services. PDFSearch is different in exactly the way that matters — the document never leaves your browser. There is no upload, no server copy, no vendor agreement to negotiate, because the search runs locally in the page.</p>
            <p>On top of that privacy floor, it’s genuinely fast on the documents lawyers actually handle: a 500-page discovery production, a stack of contracts, a deposition transcript. Search a defined term with case sensitivity on and every occurrence comes back with page numbers — “Change of Control” matches the defined term, not a stray lowercase phrase. Across a whole production, <Link href="/bulk-pdf-search" className="text-[var(--accent)] hover:underline">bulk PDF search</Link> confirms in one pass which documents mention a name or clause.</p>
            <p>The honest caveats: scanned exhibits need OCR before their text is searchable (<Link href="/search-scanned-pdf" className="text-[var(--accent)] hover:underline">how to check</Link>), and this is a search tool, not legal analysis. For contracts and filings specifically, <Link href="/pdf-search-for-finance" className="text-[var(--accent)] hover:underline">searching financial filings</Link> shares the same exact-match approach.</p>
          </div>
        </section>
      }
      howToSteps={[
        {
          title: "Load the documents",
          desc: "Drag the discovery set, contracts, or transcript onto the upload zone. Nothing is uploaded \u2014 files are read locally in your browser.",
        },
        {
          title: "Search a defined term or name",
          desc: "Type the clause, party, or term. Turn on case-sensitive and whole-word modes for defined terms that must match exactly.",
        },
        {
          title: "Review every occurrence",
          desc: "Matches are grouped by document with page numbers and surrounding text, so you can cite the exact page.",
        },
        {
          title: "Export the hits",
          desc: "Download all matches to CSV \u2014 document, page, excerpt \u2014 for a privilege log, review memo, or meet-and-confer.",
        },
      ]}
      faqItems={[
        {
          question: "Is it safe to search privileged documents?",
          answer: "Yes. PDFSearch parses files entirely inside your browser \u2014 they are never uploaded to any server. Privileged and confidential material stays on your device, so there\u2019s no vendor to trust with it.",
        },
        {
          question: "Can it handle a 500-page document?",
          answer: "Yes. Long filings, discovery productions, and transcripts search in seconds because the work happens locally. Each file can be up to 50 MB.",
        },
        {
          question: "Can I match a defined term exactly?",
          answer: "Yes. Case-sensitive and whole-word search let you match a defined term like \u201cConfidential Information\u201d precisely without catching unrelated lowercase uses.",
        },
        {
          question: "Do I need a vendor agreement or DPA?",
          answer: "No. Because nothing is uploaded or processed on a server, there is no data-processing arrangement to sign \u2014 the tool never receives your files.",
        },
        {
          question: "Can I search scanned exhibits?",
          answer: "Only if they have been OCR\u2019d. A raw scan is an image with no searchable text. Load it and search for a visible word to confirm whether a text layer exists.",
        },
      ]}
      relatedTools={[
        { href: "/bulk-pdf-search", title: "Bulk PDF Search", description: "Confirm which documents mention a term across a production." },
        { href: "/search-text-in-pdf", title: "Search Text in PDF", description: "Exact, case-sensitive defined-term matching." },
        { href: "/search-government-documents", title: "Search Government Documents", description: "FOIA releases and public records." },
      ]}
      relatedArticles={[
        { href: "/blog/how-lawyers-search-500-page-pdfs", title: "How Lawyers Search 500-Page PDFs", description: "The confidential-search workflow in full." },
        { href: "/blog/ctrlf-vs-advanced-pdf-search", title: "Ctrl+F vs Advanced PDF Search", description: "Why find-in-page fails on large productions." },
      ]}
      schemaMarkup={[pageFaqSchema, pageBreadcrumb]}
    />
  );
}
