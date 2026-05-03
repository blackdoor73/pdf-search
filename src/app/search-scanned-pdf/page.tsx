import type { Metadata } from "next";
import { LandingPageShell } from "@/components/LandingPageShell";

export const metadata: Metadata = {
  title: "Search Inside Scanned PDF — Find Text in Scanned Documents",
  description:
    "Learn how to search text inside scanned PDF files. PDFSearch works with any PDF that has a text layer. Understand scanned PDFs and OCR, and find the right tool for your needs.",
  alternates: {
    canonical: "https://www.pdfsearch.info/search-scanned-pdf",
  },
  openGraph: {
    title: "Search Inside Scanned PDF — Find Text in Scanned Documents",
    description:
      "How to search text in scanned PDF files. Free tool for text-layer PDFs, plus guidance on OCR for image PDFs.",
    url: "https://www.pdfsearch.info/search-scanned-pdf",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can you search text in a scanned PDF?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can search a scanned PDF only if it has an embedded text layer (added by OCR software). PDFSearch works with any PDF that has searchable text, including scanned PDFs saved with OCR. Purely image-based scanned PDFs without a text layer cannot be searched by any text search tool without first running OCR.",
      },
    },
    {
      "@type": "Question",
      name: "How do I make a scanned PDF searchable?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "To make a scanned PDF searchable, run it through OCR (Optical Character Recognition) software. Options include Adobe Acrobat, Google Drive (upload the PDF and open with Google Docs), or free tools like OCRmyPDF. Once OCR is applied, the PDF will have a text layer that PDFSearch can search.",
      },
    },
  ],
};

export default function SearchScannedPdfPage() {
  return (
    <LandingPageShell
      headline="Search Inside Scanned PDFs"
      subheadline="Understand when PDF search works with scanned documents — and how to make any scanned PDF fully searchable."
      description="Many PDFs are created by scanning physical documents. Whether you can search a scanned PDF depends on whether it has an embedded text layer. PDFSearch works instantly with any PDF that has searchable text — including OCR-processed scanned documents."
      benefits={[
        "Works with OCR-processed PDFs",
        "Supports text-layer scans",
        "Guides for image-only PDFs",
        "Free & instant — no account",
      ]}
      howToSteps={[
        {
          title: "Check if your scanned PDF has a text layer",
          desc: "Try opening your PDF in a browser and pressing Ctrl+F. If you can select text or Ctrl+F finds results, the PDF has a text layer and PDFSearch will work perfectly.",
        },
        {
          title: "If text-selectable: search with PDFSearch",
          desc: "Upload your scanned PDF to PDFSearch and search as normal. PDFSearch extracts the text layer and searches it instantly, even for multi-page scanned documents.",
        },
        {
          title: "If image-only: run OCR first",
          desc: "Upload your scanned PDF to Google Drive and open it with Google Docs — this applies free OCR. Or use Adobe Acrobat's 'Make Searchable' feature. Then download the resulting PDF with text layer.",
        },
        {
          title: "Search the OCR-processed PDF",
          desc: "Once your scanned PDF has a text layer, upload it to PDFSearch and search normally. Results include page numbers and highlighted context.",
        },
      ]}
      faqItems={[
        {
          question: "Why can't I search my scanned PDF?",
          answer:
            "If your scanned PDF is an image file (no text layer), PDFSearch and other text search tools won't find any text. You need to first run OCR (Optical Character Recognition) to add a searchable text layer.",
        },
        {
          question: "How do I know if my PDF is searchable or just an image?",
          answer:
            "Open your PDF in a browser or PDF reader. If you can click to select text, or if Ctrl+F finds results, it has a text layer. If you can't select any text, it's image-only.",
        },
        {
          question: "What is OCR and why do I need it for scanned PDFs?",
          answer:
            "OCR (Optical Character Recognition) is technology that converts images of text into actual machine-readable text. Scanned documents are photos of pages — OCR reads those images and creates a text layer so search tools can find content.",
        },
        {
          question: "Can PDFSearch search scanned PDFs with OCR text layers?",
          answer:
            "Yes. If your scanned PDF has been OCR-processed and has a text layer, PDFSearch will search it perfectly — the same as any other PDF.",
        },
        {
          question: "What is the best free OCR tool for scanned PDFs?",
          answer:
            "Google Drive's built-in OCR (upload PDF → open with Google Docs) is free and works well for most documents. OCRmyPDF is a free command-line tool for batch processing. Adobe Acrobat has a paid 'Make Searchable PDF' feature with higher accuracy.",
        },
      ]}
      schemaMarkup={faqSchema}
    />
  );
}
