import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/LandingPageShell";

export const metadata: Metadata = {
  title: "Find Words in PDF Online Free — PDF Word Search Tool",
  description:
    "Find any word in a PDF instantly. Free online tool to search and highlight words across single or multiple PDF files. No account, no software — works in your browser.",
  alternates: {
    canonical: "https://www.pdfsearch.info/find-words-in-pdf",
  },
  openGraph: {
    title: "Find Words in PDF Online Free — PDF Word Search Tool",
    description:
      "Free tool to find any word in a PDF instantly. Search single or multiple PDFs at once. 100% private.",
    url: "https://www.pdfsearch.info/find-words-in-pdf",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pdfsearch.info" },
    { "@type": "ListItem", position: 2, name: "Find Words in PDF", item: "https://www.pdfsearch.info/find-words-in-pdf" },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I find a word in a PDF document?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "To find a word in a PDF, go to pdfsearch.info, upload your PDF file, and type the word in the search bar. PDFSearch will find every occurrence of that word with the page number and surrounding text.",
      },
    },
    {
      "@type": "Question",
      name: "How can I find a word in a PDF without Adobe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PDFSearch is a free browser-based alternative to Adobe's Find feature. Upload any PDF and search for any word — no Adobe software needed.",
      },
    },
  ],
};

export default function FindWordsInPdfPage() {
  return (
    <LandingPageShell
      headline="Find Any Word in a PDF — Free Online Tool"
      subheadline="Search for words, phrases, or numbers across any PDF file. Instant results, zero downloads."
      description="PDFSearch is the fastest way to find words in a PDF online. Whether you need to locate a specific term in a legal document, find a keyword in a research paper, or search a company report — get instant highlighted results with page numbers."
      benefits={[
        "Highlights every match",
        "Shows page number & context",
        "Whole-word matching option",
        "Search multiple PDFs at once",
      ]}
      howToSteps={[
        {
          title: "Open PDFSearch",
          desc: "Go to pdfsearch.info in your browser. No account or download required.",
        },
        {
          title: "Upload your PDF file",
          desc: "Drag and drop a PDF onto the upload zone or click to select a file. Files up to 50 MB are supported.",
        },
        {
          title: "Enter the word to find",
          desc: "Type the word or phrase in the search box. Enable whole-word matching to find standalone words only (e.g., find ’act’ but not ’action’).",
        },
        {
          title: "See results with page numbers",
          desc: "Every match appears with its page number and the surrounding sentence so you can see the word in context without opening the full PDF.",
        },
      ]}
      faqItems={[
        {
          question: "How do I find a specific word in a PDF?",
          answer:
            "Upload your PDF to pdfsearch.info and type the word in the search box. Every instance of that word is returned with its page number and text context.",
        },
        {
          question: "Can I find multiple words in a PDF at once?",
          answer:
            "Search for a phrase to find multiple words in sequence. For individual keywords, run separate searches — the session stays loaded between searches.",
        },
        {
          question: "Is there a free word search tool for PDFs?",
          answer:
            "Yes — PDFSearch is completely free with no signup or account required.",
        },
        {
          question: "Why can't I find a word in my PDF?",
          answer:
            "If PDFSearch returns no results for a word you know is in the document, the PDF may be scanned (image-based) without a text layer. Try searching for a different known word to confirm.",
        },
        {
          question: "Can I find a word across multiple PDF files?",
          answer:
            "Yes. Load multiple PDFs and run your search — PDFSearch will find the word in all loaded documents and show you which file and page each match is on.",
        },
      ]}
      breadcrumbLabel="Find Words in PDF"
      trustSignals={[
        { title: "Every occurrence listed", desc: "Not one-at-a-time clicking — the full list at once" },
        { title: "Context included", desc: "See the sentence around each match before jumping in" },
        { title: "Counts per document", desc: "Instantly see which files mention a term most" },
      ]}
      useCaseSection={
        <section aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-4">
            From “is it in here?” to “show me everywhere it appears”
          </h2>
          <div className="font-sans text-sm text-[var(--text-2)] leading-relaxed space-y-4 max-w-3xl">
            <p>Sometimes you don’t want the first match — you want all of them. A student building flashcards wants every place a concept appears in the textbook; an editor wants every use of a deprecated product name; a paralegal wants every mention of a party across a brief.</p>
            <p>PDFSearch returns the complete list with page numbers and surrounding text, so you can scan occurrences like search-engine results instead of paging through a viewer. It works the same across <Link href="/search-multiple-pdfs" className="text-[var(--accent)] hover:underline">many files at once</Link>, and match counts per document double as a relevance ranking. Students, this one’s built for you — <Link href="/pdf-search-for-students" className="text-[var(--accent)] hover:underline">PDF search for students</Link> walks through exam-prep workflows.</p>
          </div>
        </section>
      }
      relatedTools={[
        { href: "/search-text-in-pdf", title: "Search Text in PDF", description: "Precision lookups with case and whole-word modes." },
        { href: "/pdf-search-for-students", title: "PDF Search for Students", description: "Textbooks, lecture notes, exam prep." },
        { href: "/how-to-search-pdf", title: "How to Search a PDF", description: "Start-to-finish basics." },
      ]}
      relatedArticles={[
        { href: "/blog/search-multiple-pdfs-online", title: "How to Search Multiple PDFs Online", description: "Batch workflows tutorial." },
      ]}
      schemaMarkup={[faqSchema, breadcrumbSchema]}
    />
  );
}
