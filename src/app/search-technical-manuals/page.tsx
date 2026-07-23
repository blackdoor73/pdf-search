import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/LandingPageShell";
import { absUrl, breadcrumbSchema, faqSchema } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Search Technical Manuals \u2014 Find Error Codes & Procedures",
  description: "Search product manuals and documentation for error codes, part numbers, and procedures. Free, private full-text PDF search \u2014 instant lookups across manuals, nothing uploaded, no account.",
  alternates: { canonical: absUrl("/search-technical-manuals") },
  openGraph: {
    title: "Search Technical Manuals \u2014 Find Error Codes & Procedures",
    description: "Search product manuals for error codes and procedures \u2014 instant lookups across every manual, nothing uploaded.",
    url: absUrl("/search-technical-manuals"),
  },
};

const pageFaqSchema = faqSchema([
    { question: "Can I look up an error code fast?", answer: "Yes. Search the code across a loaded manual and jump straight to the page that defines it \u2014 no scrolling. Whole-word mode ensures the code matches exactly." },
    { question: "Can I search several manuals at once?", answer: "Yes. Load multiple manuals \u2014 up to 200 files \u2014 and query across all of them, so a lookup can span an entire equipment or product line." },
    { question: "Does it match codes and part numbers exactly?", answer: "Yes. Case-sensitive and whole-word search match an identifier like E-42 or a part number precisely, without catching similar strings." },
    { question: "Are proprietary service manuals kept private?", answer: "Yes. Manuals are parsed in your browser and never uploaded, so proprietary service documentation stays in-house \u2014 and it works on locked-down field laptops." },
    { question: "Can I search a scanned manual?", answer: "Only if it has an OCR text layer. A scanned manual is an image until OCR is run \u2014 test by searching a code you can see printed on the page." },
]);

const pageBreadcrumb = breadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Technical Manuals", path: "/search-technical-manuals" },
]);

export default function SearchTechnicalManualsPage() {
  return (
    <LandingPageShell
      headline="Search Technical Manuals & Documentation"
      subheadline="Look up an error code, part, or procedure across product manuals in seconds \u2014 no more scrolling a 400-page PDF."
      description="Search product manuals and documentation for error codes, part numbers, and procedures. Free, private full-text PDF search \u2014 instant lookups across manuals, nothing uploaded, no account."
      breadcrumbLabel="Technical Manuals"
      benefits={[
        "Instant error-code lookup",
        "Exact code and part matching",
        "Search several manuals at once",
        "Private \u2014 nothing uploaded",
      ]}
      trustSignals={[
        { title: "Made for lookups", desc: "Jump straight to the error code or procedure" },
        { title: "Exact codes", desc: "Whole-word matching for codes and part numbers" },
        { title: "Offline-friendly & private", desc: "Manuals are parsed in your browser only" },
      ]}
      useCaseSection={
        <section aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-4">
            Turn a 400-page manual into an instant lookup
          </h2>
          <div className="font-sans text-sm text-[var(--text-2)] leading-relaxed space-y-4 max-w-3xl">
            <p>A product manual is a reference document, not a book you read front to back. When a machine throws error E-42 or you need the torque spec for a specific bolt, you want that page now — not a scroll through 400 pages of a PDF viewer. The built-in find box gets you there eventually, but only in one manual at a time and with no overview.</p>
            <p>Load the manuals and search the code or term directly. Whole-word, case-sensitive matching means E-42 matches the code and not “page 42,” and you can keep several manuals open at once so a lookup spans the whole equipment set. Results come back with page numbers so you land on the procedure immediately. The exact-match modes are the same ones <Link href="/pdf-search-for-engineers" className="text-[var(--accent)] hover:underline">engineers use for datasheets</Link>.</p>
            <p>Because everything runs in your browser with nothing uploaded, this works on a locked-down field laptop and keeps proprietary service manuals in-house. Any text-based manual works; a scanned manual needs an OCR text layer before its codes are searchable.</p>
          </div>
        </section>
      }
      howToSteps={[
        {
          title: "Load the manuals",
          desc: "Drag the product manuals and service documentation onto the upload zone \u2014 one or several at once, each up to 50 MB.",
        },
        {
          title: "Search the code or term",
          desc: "Type the error code, part number, or procedure name. Use whole-word mode so a code matches exactly, not as a substring.",
        },
        {
          title: "Jump to the procedure",
          desc: "Results show page numbers and the surrounding line, so you land directly on the fix or specification.",
        },
        {
          title: "Keep it handy",
          desc: "Export frequent lookups to CSV, or keep the manuals loaded in a tab for repeated field reference.",
        },
      ]}
      faqItems={[
        {
          question: "Can I look up an error code fast?",
          answer: "Yes. Search the code across a loaded manual and jump straight to the page that defines it \u2014 no scrolling. Whole-word mode ensures the code matches exactly.",
        },
        {
          question: "Can I search several manuals at once?",
          answer: "Yes. Load multiple manuals \u2014 up to 200 files \u2014 and query across all of them, so a lookup can span an entire equipment or product line.",
        },
        {
          question: "Does it match codes and part numbers exactly?",
          answer: "Yes. Case-sensitive and whole-word search match an identifier like E-42 or a part number precisely, without catching similar strings.",
        },
        {
          question: "Are proprietary service manuals kept private?",
          answer: "Yes. Manuals are parsed in your browser and never uploaded, so proprietary service documentation stays in-house \u2014 and it works on locked-down field laptops.",
        },
        {
          question: "Can I search a scanned manual?",
          answer: "Only if it has an OCR text layer. A scanned manual is an image until OCR is run \u2014 test by searching a code you can see printed on the page.",
        },
      ]}
      relatedTools={[
        { href: "/pdf-search-for-engineers", title: "PDF Search for Engineers", description: "Datasheets, specs, and standards." },
        { href: "/search-text-in-pdf", title: "Search Text in PDF", description: "Exact code and part-number matching." },
        { href: "/free-pdf-search-engine", title: "Free PDF Search Engine", description: "A private search engine for your docs." },
      ]}
      relatedArticles={[
        { href: "/blog/ctrlf-vs-advanced-pdf-search", title: "Ctrl+F vs Advanced PDF Search", description: "Why find-in-page is slow for reference lookups." },
        { href: "/blog/best-pdf-search-tools", title: "Best PDF Search Tools", description: "Comparing options for documentation." },
      ]}
      schemaMarkup={[pageFaqSchema, pageBreadcrumb]}
    />
  );
}
