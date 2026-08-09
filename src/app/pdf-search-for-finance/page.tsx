import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/LandingPageShell";
import { absUrl, breadcrumbSchema, faqSchema } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "PDF Search for Finance \u2014 Search 10-Ks, Filings & Reports",
  description: "Search 10-Ks, prospectuses, and earnings reports for line items, covenants, and defined terms. Free, private full-text PDF search \u2014 exact matching, nothing uploaded, no account.",
  alternates: { canonical: absUrl("/pdf-search-for-finance") },
  openGraph: {
    title: "PDF Search for Finance \u2014 Search 10-Ks, Filings & Reports",
    description: "Search filings and reports for line items, covenants, and defined terms \u2014 exactly, and without uploading anything.",
    url: absUrl("/pdf-search-for-finance"),
  },
};

const pageFaqSchema = faqSchema([
    { question: "Can I search across multiple filings at once?", answer: "Yes. Load up to 200 documents \u2014 10-Ks, 10-Qs, prospectuses, earnings releases \u2014 and run one query across all of them, with results grouped by filing." },
    { question: "Can I match an exact figure or defined term?", answer: "Yes. Whole-word and case-sensitive search let you match a specific line item or a defined term like \u201cAdjusted EBITDA\u201d precisely, without partial or unrelated matches." },
    { question: "Are deal documents kept confidential?", answer: "Yes. Documents are parsed inside your browser and never uploaded, so confidential deal materials and drafts stay entirely on your device." },
    { question: "How large a document can it handle?", answer: "Each PDF can be up to 50 MB \u2014 comfortably larger than a typical 300-page annual report \u2014 and long filings search in seconds." },
    { question: "Can I search scanned filings?", answer: "Yes. Most modern filings are native-text and search instantly. An older scanned filing with no text layer is read with OCR in your browser — nothing is uploaded. OCR matches are badged, since recognition can garble a figure on a poor scan." },
]);

const pageBreadcrumb = breadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "For Finance", path: "/pdf-search-for-finance" },
]);

export default function PdfSearchForFinancePage() {
  return (
    <LandingPageShell
      headline="PDF Search for Finance Professionals"
      subheadline="Search 10-Ks, prospectuses, and earnings reports for the exact line item, covenant, or defined term \u2014 across every document at once."
      description="Search 10-Ks, prospectuses, and earnings reports for line items, covenants, and defined terms. Free, private full-text PDF search \u2014 exact matching, nothing uploaded, no account."
      breadcrumbLabel="For Finance"
      benefits={[
        "Search filings and reports at once",
        "Exact figures and defined terms",
        "Trace covenants across documents",
        "Private \u2014 nothing uploaded",
      ]}
      trustSignals={[
        { title: "Filing-scale search", desc: "A 300-page 10-K searches in seconds" },
        { title: "Exact matching", desc: "Case-sensitive terms for covenants and definitions" },
        { title: "Confidential", desc: "Deal documents are parsed locally, never uploaded" },
      ]}
      useCaseSection={
        <section aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-4">
            Find the line item, covenant, or term — exactly
          </h2>
          <div className="font-sans text-sm text-[var(--text-2)] leading-relaxed space-y-4 max-w-3xl">
            <p>Financial documents are long, dense, and precise — and the questions asked of them are equally precise. Where is the debt covenant defined, does this quarter’s 10-K still contain that risk-factor language, which of these filings mentions the segment you’re modeling. Ctrl+F in a viewer answers one file slowly; it doesn’t answer “across these ten filings.”</p>
            <p>Load the filings together and search once. Exact and case-sensitive matching is the point here: a defined term like “Consolidated EBITDA” or a specific line item should match precisely, not approximately. Results come back per document with page numbers so you can cite the filing and page in a memo or model note. To check a term across a whole set of filings in one pass, <Link href="/bulk-pdf-search" className="text-[var(--accent)] hover:underline">bulk PDF search</Link> does it in a single query.</p>
            <p>Deal documents and drafts stay confidential — parsing is in-browser, with no upload. The same exact-match discipline that lawyers rely on applies here; if your work spans contracts too, see <Link href="/pdf-search-for-lawyers" className="text-[var(--accent)] hover:underline">PDF search for lawyers</Link>.</p>
          </div>
        </section>
      }
      howToSteps={[
        {
          title: "Load the filings",
          desc: "Drag the 10-Ks, prospectuses, or reports onto the upload zone, or paste links to filings. Up to 200 documents at once.",
        },
        {
          title: "Search the exact term",
          desc: "Type the line item, covenant, or defined term. Enable case-sensitive and whole-word modes so figures and definitions match precisely.",
        },
        {
          title: "Compare across documents",
          desc: "Matches group by filing with page numbers, so you can see which documents contain the language and where.",
        },
        {
          title: "Export for your model or memo",
          desc: "Download matches to CSV with filing, page, and excerpt for citations in a model note or investment memo.",
        },
      ]}
      faqItems={[
        {
          question: "Can I search across multiple filings at once?",
          answer: "Yes. Load up to 200 documents \u2014 10-Ks, 10-Qs, prospectuses, earnings releases \u2014 and run one query across all of them, with results grouped by filing.",
        },
        {
          question: "Can I match an exact figure or defined term?",
          answer: "Yes. Whole-word and case-sensitive search let you match a specific line item or a defined term like \u201cAdjusted EBITDA\u201d precisely, without partial or unrelated matches.",
        },
        {
          question: "Are deal documents kept confidential?",
          answer: "Yes. Documents are parsed inside your browser and never uploaded, so confidential deal materials and drafts stay entirely on your device.",
        },
        {
          question: "How large a document can it handle?",
          answer: "Each PDF can be up to 50 MB \u2014 comfortably larger than a typical 300-page annual report \u2014 and long filings search in seconds.",
        },
        {
          question: "Can I search scanned filings?",
          answer: "Yes. Most modern filings are native-text and search instantly. An older scanned filing with no text layer is read with OCR in your browser — nothing is uploaded. OCR matches are badged, since recognition can garble a figure on a poor scan.",
        },
      ]}
      relatedTools={[
        { href: "/search-text-in-pdf", title: "Search Text in PDF", description: "Exact, case-sensitive term and figure matching." },
        { href: "/bulk-pdf-search", title: "Bulk PDF Search", description: "Trace a covenant across a whole set of filings." },
        { href: "/pdf-search-for-lawyers", title: "PDF Search for Lawyers", description: "The same exact-match approach for contracts." },
      ]}
      relatedArticles={[
        { href: "/blog/best-pdf-search-tools", title: "Best PDF Search Tools", description: "How the options compare for filings." },
        { href: "/blog/ctrlf-vs-advanced-pdf-search", title: "Ctrl+F vs Advanced PDF Search", description: "Why find-in-page doesn\u2019t scale to filings." },
      ]}
      schemaMarkup={[pageFaqSchema, pageBreadcrumb]}
    />
  );
}
