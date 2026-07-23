import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/LandingPageShell";

export const metadata: Metadata = {
  title: "How to Search Text Inside a PDF — Step-by-Step Guide",
  description:
    "Learn how to search words in a PDF online for free. Upload any PDF or paste a URL and instantly find any word, phrase, or number — no software needed.",
  alternates: {
    canonical: "https://www.pdfsearch.info/how-to-search-pdf",
  },
  openGraph: {
    title: "How to Search Text Inside a PDF — Step-by-Step Guide",
    description:
      "Learn how to search words in a PDF online for free. Upload any PDF and instantly find any word or phrase.",
    url: "https://www.pdfsearch.info/how-to-search-pdf",
  },
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Search Text Inside a PDF",
  description:
    "A step-by-step guide to searching text inside PDF files online using PDFSearch — free, instant, and private.",
  image: "https://www.pdfsearch.info/opengraph-image",
  totalTime: "PT1M",
  supply: [
    { "@type": "HowToSupply", name: "PDF file or PDF URL" },
  ],
  tool: [
    { "@type": "HowToTool", name: "PDFSearch (free, browser-based)" },
  ],
  step: [
    {
      "@type": "HowToStep",
      name: "Open PDFSearch",
      text: "Go to pdfsearch.info in any modern web browser. No signup or download required.",
      url: "https://www.pdfsearch.info",
    },
    {
      "@type": "HowToStep",
      name: "Load your PDF",
      text: "Drag and drop your PDF file into the upload zone, or paste a public PDF URL into the URL input. You can load multiple PDFs at once.",
    },
    {
      "@type": "HowToStep",
      name: "Type your search query",
      text: "Enter any word, phrase, or number in the search bar. Use the options to enable case-sensitive or whole-word matching.",
    },
    {
      "@type": "HowToStep",
      name: "View highlighted results",
      text: "Results appear instantly, grouped by file with page numbers and highlighted text context. Export all matches as CSV if needed.",
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pdfsearch.info" },
    { "@type": "ListItem", position: 2, name: "How to Search a PDF", item: "https://www.pdfsearch.info/how-to-search-pdf" },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I search words in a PDF online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Go to pdfsearch.info, upload your PDF or paste a URL, then type your search query. Results appear instantly with the matching text highlighted in context.",
      },
    },
    {
      "@type": "Question",
      name: "Can I search a PDF without downloading it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Paste any public HTTPS PDF URL into PDFSearch and it will fetch and search the PDF directly — no download needed.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free tool to search inside PDF files?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "PDFSearch is completely free. No account, no subscription, no hidden fees. Upload PDFs and search instantly.",
      },
    },
  ],
};

export default function HowToSearchPdfPage() {
  return (
    <LandingPageShell
      headline="How to Search Text Inside a PDF"
      subheadline="Find any word or phrase in your PDF files instantly — free, online, no software needed."
      description="Whether you need to find a clause in a contract, a citation in a research paper, or a keyword across dozens of documents, PDFSearch makes it effortless. Upload your PDF file or paste a URL and search it in seconds."
      benefits={[
        "Works in any browser",
        "No downloads or software",
        "Search multiple PDFs at once",
        "100% private & free",
      ]}
      howToSteps={[
        {
          title: "Open PDFSearch in your browser",
          desc: "Navigate to pdfsearch.info — no account, app, or plugin required. It works in Chrome, Safari, Firefox, and Edge.",
        },
        {
          title: "Upload your PDF or paste a URL",
          desc: "Drag and drop a PDF file from your computer, or paste a public PDF URL (e.g., a government report or academic paper). You can add multiple PDFs at the same time.",
        },
        {
          title: "Enter your search query",
          desc: "Type the word, phrase, number, or any text you’re looking for. Toggle case-sensitive or whole-word matching for precision.",
        },
        {
          title: "Browse instant results",
          desc: "Each matching PDF is listed with the page number and surrounding text context, with your search term highlighted. Export as CSV for further use.",
        },
      ]}
      faqItems={[
        {
          question: "How do I search words in a PDF online for free?",
          answer:
            "Use PDFSearch at pdfsearch.info — it's completely free. Upload your PDF or paste a URL, type your query, and get instant highlighted results.",
        },
        {
          question: "Can I search a PDF without Adobe Acrobat?",
          answer:
            "Yes. PDFSearch is a browser-based tool that requires no software installation. It works entirely in your browser — no Acrobat, no plugins, no app.",
        },
        {
          question: "What is the fastest way to find words in a PDF?",
          answer:
            "PDFSearch is the fastest way to find words in a PDF online. It processes the full text of your PDF in your browser and returns highlighted results in milliseconds.",
        },
        {
          question: "Can I search multiple PDF files at the same time?",
          answer:
            "Yes. PDFSearch lets you load up to 200 PDF files simultaneously and search all of them with one query. Results are grouped by file.",
        },
        {
          question: "Does searching PDFs online require an account?",
          answer:
            "No. PDFSearch is completely anonymous — no signup, no login, no email required. Just open the tool and start searching.",
        },
      ]}
      breadcrumbLabel="How to Search a PDF"
      trustSignals={[
        { title: "Works with any text PDF", desc: "Reports, contracts, papers, manuals, ebooks" },
        { title: "Clear, visual results", desc: "Highlighted matches with page numbers and context" },
        { title: "Nothing to learn", desc: "Drop a file, type a word — that’s the whole manual" },
      ]}
      useCaseSection={
        <section aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-4">
            Beyond Ctrl+F: what “searching a PDF” really involves
          </h2>
          <div className="font-sans text-sm text-[var(--text-2)] leading-relaxed space-y-4 max-w-3xl">
            <p>Every PDF viewer has a find box, so why does “how to search a PDF” get asked so often? Because the built-in find only works one file at a time, hides matches behind next/next/next clicking, and gives you no overview of where a term appears. The moment you need “every page that mentions this” or “which of these files contains that,” find-in-page runs out of road — we break down exactly where in <Link href="/blog/ctrlf-vs-advanced-pdf-search" className="text-[var(--accent)] hover:underline">Ctrl+F vs advanced PDF search</Link>.</p>
            <p>PDFSearch lists every match at once with surrounding context, works across <Link href="/search-multiple-pdfs" className="text-[var(--accent)] hover:underline">multiple PDFs simultaneously</Link>, and supports case-sensitive and whole-word modes for precise lookups like part numbers or legal defined terms — more on that in <Link href="/search-text-in-pdf" className="text-[var(--accent)] hover:underline">search text in PDF</Link>.</p>
            <p>One honest caveat: a PDF must contain a text layer to be searchable. Pure image scans need OCR first — <Link href="/search-scanned-pdf" className="text-[var(--accent)] hover:underline">here is how to tell and what to do</Link>.</p>
          </div>
        </section>
      }
      relatedTools={[
        { href: "/search-text-in-pdf", title: "Search Text in PDF", description: "Exact-match search with case and whole-word options." },
        { href: "/find-words-in-pdf", title: "Find Words in PDF", description: "List every occurrence with page numbers." },
        { href: "/search-scanned-pdf", title: "Search Scanned PDFs", description: "What works when your PDF is a scan." },
      ]}
      relatedArticles={[
        { href: "/blog/ctrlf-vs-advanced-pdf-search", title: "Ctrl+F vs Advanced PDF Search", description: "Where the browser's find box falls short." },
        { href: "/blog/best-pdf-search-tools", title: "Best PDF Search Tools", description: "How the approaches compare." },
      ]}
      schemaMarkup={[howToSchema, faqSchema, breadcrumbSchema]}
    />
  );
}
