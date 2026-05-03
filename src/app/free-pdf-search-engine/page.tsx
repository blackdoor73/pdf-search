import type { Metadata } from "next";
import { LandingPageShell } from "@/components/LandingPageShell";

export const metadata: Metadata = {
  title: "Free PDF Search Engine — Search Any PDF Document Online",
  description:
    "The best free PDF search engine. Search inside any PDF document — upload files or paste URLs. Instant full-text search across hundreds of PDFs. No account needed.",
  alternates: {
    canonical: "https://www.pdfsearch.info/free-pdf-search-engine",
  },
  openGraph: {
    title: "Free PDF Search Engine — Search Any PDF Document Online",
    description:
      "Full-text PDF search engine — free, instant, and 100% private. Search hundreds of PDFs at once.",
    url: "https://www.pdfsearch.info/free-pdf-search-engine",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the best free PDF search engine?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PDFSearch (pdfsearch.info) is the best free PDF search engine available online. It supports full-text search across multiple PDFs simultaneously, works with file uploads and URLs, and processes everything in your browser for complete privacy.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a search engine for PDF documents?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. PDFSearch is a dedicated PDF search engine that lets you search the full text of any PDF document instantly. Unlike general web search engines, it searches inside the document content rather than file names.",
      },
    },
  ],
};

export default function FreePdfSearchEnginePage() {
  return (
    <LandingPageShell
      headline="Free PDF Search Engine"
      subheadline="Full-text search across any PDF document — instantly, privately, and completely free."
      description="PDFSearch is a powerful PDF search engine that runs entirely in your browser. Upload PDF files from your computer, paste PDF URLs, or load entire collections — then run full-text queries to find exactly what you need. No data leaves your device."
      benefits={[
        "Full-text search engine",
        "Search hundreds of PDFs",
        "No data uploaded to servers",
        "Free with no usage limits",
      ]}
      howToSteps={[
        {
          title: "Load your PDF documents",
          desc: "Upload PDF files from your computer or paste PDF URLs. The search engine can handle up to 200 documents and thousands of pages in a single session.",
        },
        {
          title: "Enter a full-text query",
          desc: "Type any word, phrase, name, number, or code into the search engine. It searches the complete text of every loaded PDF simultaneously.",
        },
        {
          title: "Review ranked results",
          desc: "Results are grouped by document and ordered by match count. Each result shows the page number and surrounding text so you can immediately evaluate relevance.",
        },
        {
          title: "Export your findings",
          desc: "Download all search results as a structured CSV file with document names, page numbers, and matched text for further analysis or reporting.",
        },
      ]}
      faqItems={[
        {
          question: "Is PDFSearch a free PDF search engine?",
          answer:
            "Yes. PDFSearch is completely free to use with no account, subscription, or usage limits (beyond browser memory constraints).",
        },
        {
          question: "How does a PDF search engine work?",
          answer:
            "PDFSearch uses Mozilla's pdf.js library to extract text from PDF documents entirely in your browser. It then performs fast in-memory full-text search across all extracted text, returning highlighted matches with page numbers.",
        },
        {
          question: "Can I use PDFSearch as a document search engine?",
          answer:
            "Yes. PDFSearch works as a full document search engine for your personal PDF collection. Load all your documents and search across all of them at once.",
        },
        {
          question: "Does the free PDF search engine support large files?",
          answer:
            "Yes. PDFSearch supports PDF files up to 50 MB each, with up to 200 files per session.",
        },
        {
          question: "Can I search PDFs from the internet with this search engine?",
          answer:
            "Yes. Paste any public HTTPS PDF URL and PDFSearch will fetch and index the document for you to search — no manual download needed.",
        },
      ]}
      schemaMarkup={faqSchema}
    />
  );
}
