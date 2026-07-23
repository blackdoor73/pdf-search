import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/LandingPageShell";

export const metadata: Metadata = {
  title: "Search Text in PDF Online — Find Any Word or Phrase Instantly",
  description:
    "Search text in any PDF file online for free. Find words, phrases, or numbers across single or multiple PDFs. No downloads, no software, 100% private.",
  alternates: {
    canonical: "https://www.pdfsearch.info/search-text-in-pdf",
  },
  openGraph: {
    title: "Search Text in PDF Online — Find Any Word or Phrase Instantly",
    description:
      "Find any word or phrase in a PDF instantly. Free, online, 100% private. Search single or multiple PDFs at once.",
    url: "https://www.pdfsearch.info/search-text-in-pdf",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pdfsearch.info" },
    { "@type": "ListItem", position: 2, name: "Search Text in PDF", item: "https://www.pdfsearch.info/search-text-in-pdf" },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I search for text in a PDF?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "To search text in a PDF online, go to pdfsearch.info, upload your PDF file or paste a PDF URL, type your search term, and click Search. Results appear immediately with highlighted matches and page numbers.",
      },
    },
    {
      "@type": "Question",
      name: "Can I search for a phrase in a PDF?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. PDFSearch supports phrase search — just type the full phrase in quotes or as plain text and it will find all occurrences in your PDF, including across line breaks.",
      },
    },
    {
      "@type": "Question",
      name: "How can I find text in a PDF without Adobe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PDFSearch is a free browser-based tool that lets you search text in PDFs without Adobe Acrobat. Upload your PDF and search instantly — no software installation needed.",
      },
    },
  ],
};

export default function SearchTextInPdfPage() {
  return (
    <LandingPageShell
      headline="Search Text in Any PDF — Instantly"
      subheadline="Find words, phrases, and numbers inside PDF files. Free, online, and 100% private."
      description="Whether you're scanning a contract for a specific clause, looking for a citation in a research paper, or trying to find a date in a financial report — PDFSearch finds it in seconds. No Adobe Acrobat required."
      benefits={[
        "Search words, phrases & numbers",
        "Case-sensitive search option",
        "Whole-word matching",
        "Page numbers shown with context",
      ]}
      howToSteps={[
        {
          title: "Open PDFSearch in your browser",
          desc: "Visit pdfsearch.info — works in all modern browsers on desktop and mobile. No installation or account needed.",
        },
        {
          title: "Load your PDF",
          desc: "Upload a PDF from your device or paste a direct PDF URL. PDFSearch accepts any standard PDF file up to 50 MB.",
        },
        {
          title: "Type your text query",
          desc: 'Enter the word or phrase you want to find. Use the "Case Sensitive" toggle to match exact capitalization, or "Whole Word" to avoid partial matches.',
        },
        {
          title: "See every match with context",
          desc: "All matches are shown with the surrounding text and page number so you can immediately understand the context without opening the full file.",
        },
      ]}
      faqItems={[
        {
          question: "How do I search for specific text in a PDF?",
          answer:
            "Upload your PDF to pdfsearch.info and type your text in the search box. Every occurrence of that text is highlighted with its page number and surrounding context shown.",
        },
        {
          question: "Can I search for numbers or dates in a PDF?",
          answer:
            "Yes. PDFSearch can find any text including numbers, dates, codes, identifiers, and special characters in your PDF.",
        },
        {
          question: "Does PDF text search work across multiple pages?",
          answer:
            "Yes. PDFSearch scans every page of your PDF and returns all matches, regardless of how many pages your document has.",
        },
        {
          question: "Can I use wildcards or regex in PDF search?",
          answer:
            "Currently, PDFSearch supports exact text matching with case-sensitive and whole-word options. Regex/wildcard search is on the roadmap.",
        },
        {
          question: "What if my PDF has no searchable text?",
          answer:
            "PDFSearch requires PDFs with embedded text. Scanned PDFs that are image-only won't return results unless they were saved with a text layer (e.g., using OCR software).",
        },
      ]}
      breadcrumbLabel="Search Text in PDF"
      trustSignals={[
        { title: "Exact-match precision", desc: "Case-sensitive and whole-word modes when it matters" },
        { title: "Page-level answers", desc: "Every hit tells you exactly where to look" },
        { title: "Long documents welcome", desc: "500-page filings search as fast as 5-page memos" },
      ]}
      useCaseSection={
        <section aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-4">
            Precision searching: defined terms, identifiers, exact phrases
          </h2>
          <div className="font-sans text-sm text-[var(--text-2)] leading-relaxed space-y-4 max-w-3xl">
            <p>Generic search is fine for common words, but real document work is usually more exact: a defined term like “Change of Control” that must match capitalization, a part number where PN-1042 and PN-10425 are different things, or a person’s name that’s also an ordinary word. That’s what whole-word and case-sensitive modes are for.</p>
            <p>Engineers hunting identifiers through datasheets (<Link href="/pdf-search-for-engineers" className="text-[var(--accent)] hover:underline">that workflow here</Link>) and finance teams tracing line items through <Link href="/pdf-search-for-finance" className="text-[var(--accent)] hover:underline">10-Ks and filings</Link> rely on exact matching daily. For a broader look at every occurrence of a term rather than a precise lookup, <Link href="/find-words-in-pdf" className="text-[var(--accent)] hover:underline">find words in PDF</Link> covers the counting-and-context side.</p>
          </div>
        </section>
      }
      relatedTools={[
        { href: "/find-words-in-pdf", title: "Find Words in PDF", description: "Every occurrence, with highlighted context." },
        { href: "/pdf-search-for-engineers", title: "PDF Search for Engineers", description: "Part numbers, specs, and datasheets." },
        { href: "/bulk-pdf-search", title: "Bulk PDF Search", description: "The same precision across a whole folder." },
      ]}
      relatedArticles={[
        { href: "/blog/ctrlf-vs-advanced-pdf-search", title: "Ctrl+F vs Advanced PDF Search", description: "What precise matching adds." },
      ]}
      schemaMarkup={[faqSchema, breadcrumbSchema]}
    />
  );
}
