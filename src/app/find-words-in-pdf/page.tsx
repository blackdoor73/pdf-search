import type { Metadata } from "next";
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
          desc: "Type the word or phrase in the search box. Enable whole-word matching to find standalone words only (e.g., find 'act' but not 'action').",
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
      schemaMarkup={faqSchema}
    />
  );
}
