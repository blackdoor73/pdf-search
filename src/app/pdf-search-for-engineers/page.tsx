import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/LandingPageShell";
import { absUrl, breadcrumbSchema, faqSchema } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "PDF Search for Engineers \u2014 Search Datasheets & Specs",
  description: "Search datasheets, specifications, and standards for exact part numbers and parameters. Free, private full-text PDF search with case-sensitive matching \u2014 nothing uploaded, no account.",
  alternates: { canonical: absUrl("/pdf-search-for-engineers") },
  openGraph: {
    title: "PDF Search for Engineers \u2014 Search Datasheets & Specs",
    description: "Search datasheets and specs for exact part numbers and parameters \u2014 case-sensitive, across every document at once.",
    url: absUrl("/pdf-search-for-engineers"),
  },
};

const pageFaqSchema = faqSchema([
    { question: "Can I match an exact part number?", answer: "Yes. With case-sensitive and whole-word search enabled, a part number like PN-1042 matches only that string and not longer or differently-cased variants." },
    { question: "Can I search across many datasheets at once?", answer: "Yes. Load up to 200 datasheets, specs, and standards together and run a single query across all of them, with results grouped by document." },
    { question: "Is case-sensitive search supported?", answer: "Yes. Case sensitivity is a toggle, which matters for identifiers and register names where casing is significant." },
    { question: "Are proprietary specs kept confidential?", answer: "Yes. All parsing happens in your browser; documents are never uploaded, so internal specifications and design files stay on your device." },
    { question: "Can I search a scanned standard?", answer: "Yes. If a scanned standard has no text layer, PDFSearch reads its pages with OCR in your browser \u2014 nothing is uploaded. Recognition isn't perfect on faint or skewed scans, so matches from OCR are badged with a confidence figure. OCR needs a desktop browser." },
]);

const pageBreadcrumb = breadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "For Engineers", path: "/pdf-search-for-engineers" },
]);

export default function PdfSearchForEngineersPage() {
  return (
    <LandingPageShell
      headline="PDF Search for Engineers"
      subheadline="Search datasheets, specifications, and standards for the exact part number or parameter \u2014 with case-sensitive precision."
      description="Search datasheets, specifications, and standards for exact part numbers and parameters. Free, private full-text PDF search with case-sensitive matching \u2014 nothing uploaded, no account."
      breadcrumbLabel="For Engineers"
      benefits={[
        "Exact part-number matching",
        "Search datasheets & standards at once",
        "Case-sensitive by choice",
        "Private \u2014 nothing uploaded",
      ]}
      trustSignals={[
        { title: "Exact identifiers", desc: "PN-1042 matches PN-1042, not PN-10425" },
        { title: "Spec-wide search", desc: "Query a stack of datasheets and standards together" },
        { title: "Local & private", desc: "Proprietary specs are parsed in your browser only" },
      ]}
      useCaseSection={
        <section aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-4">
            Exact identifiers, matched exactly
          </h2>
          <div className="font-sans text-sm text-[var(--text-2)] leading-relaxed space-y-4 max-w-3xl">
            <p>Engineering documents live and die by exact strings. A part number, a register address, a spec clause number, an error code — these are identifiers where a partial match is a wrong answer. Searching a datasheet with a viewer’s find box that ignores case and matches substrings is actively risky when PN-1042 and PN-10425 are different components.</p>
            <p>PDFSearch offers case-sensitive, whole-word matching precisely for this. Turn it on and an identifier matches exactly, across a whole stack of datasheets, specs, and standards loaded together — results grouped by document with page numbers so you can cite the spec and page. For the exact-match mechanics on their own, <Link href="/search-text-in-pdf" className="text-[var(--accent)] hover:underline">search text in PDF</Link> covers case-sensitive and whole-word modes in detail.</p>
            <p>Proprietary specifications and internal design docs are parsed in your browser and never uploaded, so confidential material stays in-house. When your searchable set includes product manuals as well, <Link href="/search-technical-manuals" className="text-[var(--accent)] hover:underline">searching technical manuals</Link> covers error-code and procedure lookups.</p>
          </div>
        </section>
      }
      howToSteps={[
        {
          title: "Load the datasheets and specs",
          desc: "Drag your datasheets, standards, and design docs onto the upload zone \u2014 up to 200 files, each up to 50 MB.",
        },
        {
          title: "Search the identifier",
          desc: "Type the part number, register, or clause. Turn on case-sensitive and whole-word modes so the identifier matches exactly.",
        },
        {
          title: "Locate it precisely",
          desc: "Results group by document with page numbers and the surrounding line, so you land on the exact spec reference.",
        },
        {
          title: "Export references",
          desc: "Download matches to CSV \u2014 document, page, excerpt \u2014 for a design review or bill-of-materials cross-check.",
        },
      ]}
      faqItems={[
        {
          question: "Can I match an exact part number?",
          answer: "Yes. With case-sensitive and whole-word search enabled, a part number like PN-1042 matches only that string and not longer or differently-cased variants.",
        },
        {
          question: "Can I search across many datasheets at once?",
          answer: "Yes. Load up to 200 datasheets, specs, and standards together and run a single query across all of them, with results grouped by document.",
        },
        {
          question: "Is case-sensitive search supported?",
          answer: "Yes. Case sensitivity is a toggle, which matters for identifiers and register names where casing is significant.",
        },
        {
          question: "Are proprietary specs kept confidential?",
          answer: "Yes. All parsing happens in your browser; documents are never uploaded, so internal specifications and design files stay on your device.",
        },
        {
          question: "Can I search a scanned standard?",
          answer: "Yes. If a scanned standard has no text layer, PDFSearch reads its pages with OCR in your browser \u2014 nothing is uploaded. Recognition isn't perfect on faint or skewed scans, so matches from OCR are badged with a confidence figure. OCR needs a desktop browser.",
        },
      ]}
      relatedTools={[
        { href: "/search-text-in-pdf", title: "Search Text in PDF", description: "Case-sensitive, whole-word identifier matching." },
        { href: "/search-technical-manuals", title: "Search Technical Manuals", description: "Error codes and procedures in product docs." },
        { href: "/bulk-pdf-search", title: "Bulk PDF Search", description: "Search a whole spec library at once." },
      ]}
      relatedArticles={[
        { href: "/blog/ctrlf-vs-advanced-pdf-search", title: "Ctrl+F vs Advanced PDF Search", description: "Why substring find-in-page is risky for identifiers." },
        { href: "/blog/best-pdf-search-tools", title: "Best PDF Search Tools", description: "Comparing options for technical docs." },
      ]}
      schemaMarkup={[pageFaqSchema, pageBreadcrumb]}
    />
  );
}
