import type { Metadata } from "next";
import { LandingPageShell } from "@/components/LandingPageShell";

export const metadata: Metadata = {
  title: "PDF Search Online — Free Tool to Search Inside Any PDF",
  description:
    "The best free online PDF search tool. Search text inside any PDF file instantly — upload a file or paste a URL. No software, no signup, 100% private.",
  alternates: {
    canonical: "https://www.pdfsearch.info/pdf-search-online",
  },
  openGraph: {
    title: "PDF Search Online — Free Tool to Search Inside Any PDF",
    description:
      "Search text inside any PDF online for free. Upload files or paste URLs. Instant results, 100% private.",
    url: "https://www.pdfsearch.info/pdf-search-online",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the best free PDF search tool online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PDFSearch (pdfsearch.info) is the best free online PDF search tool. It lets you search text inside any PDF instantly, supports multiple files, works with URLs, and is 100% private — all without any signup.",
      },
    },
    {
      "@type": "Question",
      name: "How do I search a PDF document online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Go to pdfsearch.info, upload your PDF file or paste a PDF URL, then type your search term. Matching text is highlighted instantly with page numbers shown.",
      },
    },
    {
      "@type": "Question",
      name: "Can I search a PDF file online without uploading it to a server?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. PDFSearch processes all files entirely in your browser. Your PDF is never uploaded to any server — it stays on your device throughout the entire search process.",
      },
    },
  ],
};

export default function PdfSearchOnlinePage() {
  return (
    <LandingPageShell
      headline="PDF Search Online — Free & Instant"
      subheadline="Search text inside any PDF file from your browser. No software, no account, no limits."
      description="PDFSearch is the best free online tool to search inside PDF files. Upload a PDF from your computer, paste a URL, or load multiple documents at once — then find any word or phrase in seconds. Your files never leave your browser."
      benefits={[
        "Free forever",
        "No signup required",
        "Works with files and URLs",
        "All processing in-browser",
      ]}
      howToSteps={[
        {
          title: "Go to pdfsearch.info",
          desc: "Open PDFSearch in your browser — Chrome, Firefox, Safari, or Edge. No extension or app to install.",
        },
        {
          title: "Upload a PDF or paste a URL",
          desc: "Click the upload area or drag a PDF file from your desktop. Or paste a public PDF link (e.g., from a government website or academic journal) into the URL field.",
        },
        {
          title: "Search with any keyword",
          desc: "Type a word, name, number, or phrase into the search box. Enable case-sensitive or whole-word matching if needed.",
        },
        {
          title: "See highlighted matches instantly",
          desc: "Every match is shown with the page number and surrounding context, with your keyword highlighted. Scroll through results or export them as CSV.",
        },
      ]}
      faqItems={[
        {
          question: "What is a PDF search tool?",
          answer:
            "A PDF search tool lets you find specific text within PDF documents. PDFSearch is an online version that requires no software — just open it in your browser and start searching.",
        },
        {
          question: "Can I search a PDF file for free online?",
          answer:
            "Yes. PDFSearch is completely free. There are no paywalls, no trial limits, and no signup required.",
        },
        {
          question: "Does PDF search work on mobile?",
          answer:
            "Yes. PDFSearch is a responsive web app that works on mobile browsers including Chrome for Android and Safari for iOS.",
        },
        {
          question: "Is it safe to search PDF files online?",
          answer:
            "PDFSearch is completely safe. All PDF processing happens in your browser using JavaScript — your file is never uploaded to any server. There is nothing to compromise.",
        },
        {
          question: "Can I search a password-protected PDF?",
          answer:
            "PDFSearch works with non-encrypted PDFs. Password-protected files cannot be searched without first unlocking them.",
        },
      ]}
      schemaMarkup={faqSchema}
    />
  );
}
