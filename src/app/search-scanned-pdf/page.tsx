import type { Metadata } from "next";
import Link from "next/link";
import { LandingPageShell } from "@/components/LandingPageShell";

export const metadata: Metadata = {
  title: "Search Inside Scanned PDF — Built-in OCR, In Your Browser",
  description:
    "Search text inside scanned PDF files. PDFSearch detects PDFs with no text layer and reads them with OCR in your browser — nothing is uploaded. Free and instant.",
  alternates: {
    canonical: "https://www.pdfsearch.info/search-scanned-pdf",
  },
  openGraph: {
    title: "Search Inside Scanned PDF — Built-in OCR, In Your Browser",
    description:
      "Scanned, image-only PDFs are read with OCR right in your browser. No upload, no account.",
    url: "https://www.pdfsearch.info/search-scanned-pdf",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.pdfsearch.info" },
    { "@type": "ListItem", position: 2, name: "Search Scanned PDF", item: "https://www.pdfsearch.info/search-scanned-pdf" },
  ],
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
        text: "Yes. PDFSearch checks whether a PDF has a text layer, and when it doesn't, it reads the scanned pages with OCR (optical character recognition) directly in your browser — the file is never uploaded. Scans that already have an OCR text layer are searched instantly, with no OCR step needed.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to run OCR before searching a scanned PDF?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. PDFSearch runs OCR for you when it detects a scanned page. Documents of about five pages or fewer are read automatically; longer ones show progress with a cancel option. OCR requires a desktop browser with enough available memory, and there is a per-search page limit to keep things responsive.",
      },
    },
  ],
};

export default function SearchScannedPdfPage() {
  return (
    <LandingPageShell
      headline="Search Inside Scanned PDFs"
      subheadline="Image-only scans have no text to find — so PDFSearch reads them with OCR, right in your browser."
      description="Many PDFs are photographs of pages, with no text layer to search. PDFSearch detects that automatically and runs OCR (optical character recognition) on the scanned pages locally — your file is never uploaded. Scans that already carry an OCR text layer are searched instantly, with no extra step."
      benefits={[
        "Built-in OCR for image-only scans",
        "Runs in your browser — no upload",
        "Instant on scans that already have text",
        "Free & instant — no account",
      ]}
      howToSteps={[
        {
          title: "Load your scanned PDF",
          desc: "Drag the file in or paste a URL. Nothing is uploaded — the PDF is opened and processed entirely inside your browser.",
        },
        {
          title: "Search as normal",
          desc: "Type the word or phrase you're looking for. PDFSearch checks each page for a usable text layer as it goes.",
        },
        {
          title: "Scanned pages are read with OCR automatically",
          desc: "When a page turns out to be an image with no text, PDFSearch reads it with OCR. Short documents happen in the background; longer ones show a progress bar you can cancel.",
        },
        {
          title: "Read the results",
          desc: "Matches appear with page numbers and highlighted context. Anything found by OCR is badged, so you know which text came from recognition rather than an embedded layer.",
        },
      ]}
      faqItems={[
        {
          question: "Can I search a scanned PDF that has no text layer?",
          answer:
            "Yes. PDFSearch detects that the page is an image and reads it with OCR in your browser. You don't need to prepare the file or run anything beforehand.",
        },
        {
          question: "Is my scanned PDF uploaded anywhere for OCR?",
          answer:
            "No. OCR runs entirely inside your browser using WebAssembly. The recognition engine and language data are served from this site as static files, and your PDF's bytes never leave your device — not even to our own servers.",
        },
        {
          question: "How long does OCR take?",
          answer:
            "Roughly a second or two per page once the engine has loaded, plus a one-time download of the recognition engine on your first scanned PDF. Documents of about five pages or fewer are read silently in the background; longer ones show a progress bar with a cancel button.",
        },
        {
          question: "Are there limits on OCR?",
          answer:
            "Yes, and they're deliberate. OCR is capped per file and per search so a large batch can't lock up your tab, and it's skipped on phones and tablets and on devices reporting little memory — the engine needs more headroom than those can safely give. When OCR is skipped, PDFSearch tells you why instead of just returning nothing.",
        },
        {
          question: "How accurate is the OCR?",
          answer:
            "On a clean, straight scan of printed text it's very good — typically well above 90% confidence, which PDFSearch reports per file. Faint print, handwriting, unusual fonts, skewed pages and heavy background noise all reduce accuracy, so a scan can occasionally miss a word that a real text layer would have matched.",
        },
        {
          question: "How do I know if a match came from OCR?",
          answer:
            "Results from a scanned file are badged \"OCR\" and the file's summary line says how many pages were read that way, so you can judge how much to trust a given match.",
        },
      ]}
      breadcrumbLabel="Search Scanned PDFs"
      trustSignals={[
        { title: "OCR runs locally", desc: "Scanned pages are read in your browser — no upload" },
        { title: "Automatic text-layer check", desc: "Every page is checked; scans are read with OCR" },
        { title: "Honest about accuracy", desc: "OCR matches are badged, with confidence reported" },
      ]}
      useCaseSection={
        <section aria-labelledby="lp-usecase-heading">
          <h2 id="lp-usecase-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-4">
            The text-layer test, and what happens when a scan fails it
          </h2>
          <div className="font-sans text-sm text-[var(--text-2)] leading-relaxed space-y-4 max-w-3xl">
            <p>A scanned PDF is a photograph of a page. Whether it can be searched directly depends on one thing: has OCR (optical character recognition) ever been run on it? If yes, an invisible text layer sits behind the image and search works normally. If no, there is no text in the file at all — pure pixels, and nothing to match a keyword against.</p>
            <p>PDFSearch checks every page for that text layer as it searches, and counts a page as textless when it holds almost nothing — a scanner stamp like &ldquo;Scanned by CamScanner&rdquo; or a bare page number doesn&rsquo;t count as searchable text. Pages that fail the test are rendered to an image and read with OCR in your browser. That covers the awkward middle case too: a filing with a digitally generated cover sheet and thirty scanned pages behind it gets the text layer used where it exists and OCR only where it&rsquo;s needed.</p>
            <p>Two honest caveats. OCR needs real memory and CPU, so it&rsquo;s skipped on phones and tablets — and when it&rsquo;s skipped, you&rsquo;re told why rather than left with an empty result. And recognition is never perfect: a clean printed scan reads reliably, but faint or skewed pages can drop a word. Everything else on this site applies once the text exists — <Link href="/how-to-search-pdf" className="text-[var(--accent)] hover:underline">the basics</Link>, <Link href="/bulk-pdf-search" className="text-[var(--accent)] hover:underline">bulk workflows</Link>, all of it. Government-record archives are the classic case of mixed scanned/native files — see <Link href="/search-government-documents" className="text-[var(--accent)] hover:underline">searching government documents</Link>.</p>
          </div>
        </section>
      }
      relatedTools={[
        { href: "/how-to-search-pdf", title: "How to Search a PDF", description: "Fundamentals for native-text PDFs." },
        { href: "/search-government-documents", title: "Search Government Documents", description: "FOIA releases and public records." },
        { href: "/pdf-search-online", title: "PDF Search Online", description: "No-install searching in the browser." },
      ]}
      relatedArticles={[
        { href: "/blog/how-to-search-scanned-pdfs", title: "How to Search Scanned PDFs", description: "The OCR pipeline, start to finish." },
      ]}
      schemaMarkup={[faqSchema, breadcrumbSchema]}
    />
  );
}
