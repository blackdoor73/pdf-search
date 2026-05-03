const siteUrl = "https://www.pdfsearch.info";

export const homepageFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I search text inside a PDF?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Upload your PDF file using the drag-and-drop zone or paste a PDF URL. Then type any word or phrase in the search box and click Search. PDFSearch will scan every page and highlight all matching text instantly.",
      },
    },
    {
      "@type": "Question",
      name: "Can I search across multiple PDF files at once?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You can load up to 200 PDF files simultaneously — by uploading files or pasting URLs — and search all of them with a single query. Results are grouped by file so you can quickly see which documents contain your search term.",
      },
    },
    {
      "@type": "Question",
      name: "Is PDFSearch free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PDFSearch is completely free. No account, no subscription, no hidden fees. Upload PDFs and search instantly with no limitations beyond browser memory.",
      },
    },
    {
      "@type": "Question",
      name: "Are my PDF files stored on your servers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. All processing happens entirely in your browser using client-side JavaScript. Your files are never uploaded to any server, never stored, and never leave your device. PDFSearch is 100% private.",
      },
    },
    {
      "@type": "Question",
      name: "Can I search PDFs from a URL without downloading them?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Paste any public HTTPS PDF URL into the URL input field. PDFSearch will fetch the PDF through a secure proxy and search it — no manual download needed.",
      },
    },
  ],
};

export const homepageHowToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Search Text Inside a PDF Online",
  description: "Search for any word or phrase inside PDF files using PDFSearch — free, instant, and private.",
  image: `${siteUrl}/opengraph-image`,
  totalTime: "PT1M",
  step: [
    {
      "@type": "HowToStep",
      name: "Load your PDFs",
      text: "Drag PDF files onto the upload zone or paste PDF URLs into the URL input. You can add up to 200 PDFs.",
      position: 1,
    },
    {
      "@type": "HowToStep",
      name: "Enter your search query",
      text: "Type the word, phrase, or number you want to find. Enable case-sensitive or whole-word options if needed.",
      position: 2,
    },
    {
      "@type": "HowToStep",
      name: "View highlighted results",
      text: "Results appear instantly grouped by file, with page numbers and highlighted matching text. Export as CSV to save your results.",
      position: 3,
    },
  ],
};
