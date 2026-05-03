import type { Metadata } from "next";
import { LandingPageShell } from "@/components/LandingPageShell";

export const metadata: Metadata = {
  title: "Bulk PDF Search — Search Thousands of PDF Files at Once",
  description:
    "Search across hundreds of PDF files simultaneously. Free bulk PDF search tool — upload a large collection of PDFs or paste URLs and run full-text search across all of them instantly.",
  alternates: {
    canonical: "https://www.pdfsearch.info/bulk-pdf-search",
  },
  openGraph: {
    title: "Bulk PDF Search — Search Thousands of PDF Files at Once",
    description:
      "Bulk PDF search — load hundreds of documents and search them all at once. Free, instant, 100% private.",
    url: "https://www.pdfsearch.info/bulk-pdf-search",
  },
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
      headline="Bulk PDF Search — Search Hundreds of Documents at Once"
      subheadline="Load your entire PDF collection and run one search across all of them simultaneously."
      description="PDFSearch is purpose-built for bulk document search. Whether you have a folder of contracts, a library of research papers, or an archive of reports — load them all and search across every page with a single query. Perfect for legal, compliance, research, and document-heavy workflows."
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
      schemaMarkup={faqSchema}
    />
  );
}
