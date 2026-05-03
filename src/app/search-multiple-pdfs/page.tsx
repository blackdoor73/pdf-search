import type { Metadata } from "next";
import { LandingPageShell } from "@/components/LandingPageShell";

export const metadata: Metadata = {
  title: "Search Across Multiple PDFs Online — Free Bulk PDF Search",
  description:
    "Search text across multiple PDF files simultaneously. Upload hundreds of PDFs or paste URLs and find any word or phrase across all of them in one search. Free, instant, private.",
  alternates: {
    canonical: "https://www.pdfsearch.info/search-multiple-pdfs",
  },
  openGraph: {
    title: "Search Across Multiple PDFs Online — Free Bulk PDF Search",
    description:
      "Upload hundreds of PDFs and search all of them with one query. Free, instant, and 100% private.",
    url: "https://www.pdfsearch.info/search-multiple-pdfs",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How can I search across multiple PDF files at once?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "With PDFSearch, you can upload up to 200 PDF files simultaneously and run a single search query across all of them. Results are returned instantly, grouped by file with page numbers and highlighted context.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free tool to search multiple PDFs?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PDFSearch is a free online tool that lets you search across multiple PDFs simultaneously. No signup, no software install, and no upload limits beyond 200 PDFs and 50 MB per file.",
      },
    },
    {
      "@type": "Question",
      name: "Can I search thousands of PDF pages at once?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. PDFSearch processes all loaded PDFs in parallel in your browser. You can search thousands of pages across dozens of documents with a single query.",
      },
    },
  ],
};

export default function SearchMultiplePdfsPage() {
  return (
    <LandingPageShell
      headline="Search Across Multiple PDFs Simultaneously"
      subheadline="Load up to 200 PDFs at once and find any word or phrase across all of them in a single search."
      description="Stop opening PDFs one by one. PDFSearch lets you bulk-load PDF files and URLs, then run one search query across all of them instantly. Perfect for research, legal review, compliance, and document analysis."
      benefits={[
        "Up to 200 PDFs at once",
        "Search thousands of pages",
        "Results grouped by file",
        "Free & no account needed",
      ]}
      howToSteps={[
        {
          title: "Load all your PDFs",
          desc: "Drag and drop multiple PDF files at once, or paste multiple PDF URLs separated by newlines. Mix file uploads and URLs freely in the same session.",
        },
        {
          title: "Run a single search",
          desc: "Type your query once and PDFSearch will scan every page of every PDF simultaneously. It searches all documents in parallel for maximum speed.",
        },
        {
          title: "Review results by file",
          desc: "Results are grouped by PDF file so you can immediately see which documents contain your search term and on which pages.",
        },
        {
          title: "Export all matches",
          desc: "Download a CSV file containing every match across all PDFs — with file names, page numbers, and text context.",
        },
      ]}
      faqItems={[
        {
          question: "How many PDFs can I search at once?",
          answer:
            "You can load up to 200 PDF files per session. Each file can be up to 50 MB. There is no limit on the number of pages per file.",
        },
        {
          question: "Is there a free tool to search multiple PDF files?",
          answer:
            "Yes — PDFSearch is completely free. Upload any number of PDFs (up to 200) and search all of them with one query. No subscription or account required.",
        },
        {
          question: "Does searching multiple PDFs at once work with URLs?",
          answer:
            "Yes. Paste multiple PDF URLs into the URL input (one per line) and PDFSearch will fetch and search all of them simultaneously.",
        },
        {
          question: "How is PDFSearch different from Ctrl+F?",
          answer:
            "Ctrl+F only searches the currently open file and only works one document at a time. PDFSearch searches across all your PDFs simultaneously with a single query — like Ctrl+F for hundreds of documents at once.",
        },
        {
          question: "Can I search large PDF collections online?",
          answer:
            "Yes. PDFSearch is designed for large-scale document search. Load your entire PDF collection and search all of them at once — ideal for document-heavy workflows.",
        },
      ]}
      schemaMarkup={faqSchema}
    />
  );
}
