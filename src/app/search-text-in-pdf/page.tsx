import type { Metadata } from "next";
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
      schemaMarkup={faqSchema}
    />
  );
}
