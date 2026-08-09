import type { Metadata } from "next";
import Link from "next/link";
import { BlogPost, H2 } from "@/components/blog/BlogPost";
import { absUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "How to Search Scanned PDFs (and When You Simply Can't)",
  description:
    "Why some scanned PDFs are searchable and others aren't, the 10-second text-layer test, what OCR actually does, and how image-only scans are read automatically in your browser.",
  alternates: { canonical: absUrl("/blog/how-to-search-scanned-pdfs") },
  openGraph: {
    title: "How to Search Scanned PDFs (and When You Simply Can't)",
    description:
      "The text-layer test, what OCR does, and how image-only scans get read automatically.",
    url: absUrl("/blog/how-to-search-scanned-pdfs"),
  },
};

export default function Post() {
  return (
    <BlogPost
      slug="how-to-search-scanned-pdfs"
      title="How to Search Scanned PDFs (and When You Simply Can't)"
      description="Some scanned PDFs search fine and others return nothing. Here's why — and a practical pipeline for the ones that don't."
      tags={["guide", "OCR", "scanned"]}
      dateISO="2026-07-23"
      dateLabel="July 23, 2026"
      readTime="6 min read"
      related={[
        { href: "/search-scanned-pdf", title: "Search Scanned PDFs", description: "The tool page, with the text-layer test built in." },
        { href: "/search-government-documents", title: "Search Government Documents", description: "FOIA releases are the classic mixed-scan case." },
        { href: "/how-to-search-pdf", title: "How to Search a PDF", description: "The fundamentals for native-text PDFs." },
      ]}
    >
      <p>
        It is one of the most confusing things about PDFs: two files can look identical on screen, yet one is fully searchable and the other returns nothing no matter what you type. The difference is invisible, and it comes down to a single question — does the file have a text layer?
      </p>

      <H2>What a scanned PDF actually is</H2>
      <p>
        When you scan a page, the scanner produces a picture of it. A PDF built from that picture is, to a computer, an image — a grid of pixels that happens to look like text to a human. There is no &quot;text&quot; in the file to search, any more than there is searchable text in a photograph of a street sign.
      </p>
      <p>
        A native PDF — one exported from Word, a browser, or a design tool — is different: the characters are stored as actual text behind the visual layout. That text is what search reads.
      </p>

      <H2>The 10-second text-layer test</H2>
      <p>
        You do not need special software to tell which kind you have. Open the PDF and try to select a sentence with your cursor, or search for a word you can clearly see on the page. If the text highlights or the search matches, there is a text layer and the file is searchable. If your cursor selects nothing and search finds nothing on a word that is plainly visible, it is image-only. Loading the file into <Link href="/search-scanned-pdf" className="text-[var(--accent)] hover:underline">a PDF search tool</Link> and searching a visible word is the fastest version of this test.
      </p>

      <H2>What OCR does — and its limits</H2>
      <p>
        Optical character recognition (OCR) looks at the image, recognizes the shapes as letters, and turns them into real text. Applied to a PDF, it writes an invisible text layer behind the picture: the file looks the same but becomes searchable.
      </p>
      <p>
        Be aware of the trade-offs: OCR accuracy drops on faint scans, unusual fonts, handwriting (often not recognized at all), and complex tables. The text it produces can contain small errors, so an exact-string search may occasionally miss a garbled word. It is very good, not perfect.
      </p>

      <H2>You no longer have to run OCR yourself</H2>
      <p>
        Historically this was a two-step chore: run the file through OCR software, then search the result. <Link href="/search-scanned-pdf" className="text-[var(--accent)] hover:underline">PDFSearch now does the OCR for you</Link>, in the browser. It checks each page for a usable text layer while it searches and reads the pages that don&apos;t have one — so an image-only scan is searchable on the first try, with no preparation.
      </p>
      <p>
        Two details worth knowing. It runs locally, using WebAssembly, so the PDF&apos;s bytes never leave your device. And it is bounded on purpose: short documents are read silently, longer ones show progress you can cancel, and there are per-file and per-search page caps so a big batch can&apos;t lock up the tab. On phones and tablets OCR is skipped entirely — the engine needs more memory than a phone can safely spare — and you get told that instead of an empty result.
      </p>
      <p>
        Because recognition is imperfect, matches that came from OCR are labelled as such, with a confidence figure per file. That way you know whether to trust a hit or go look at the page yourself.
      </p>

      <H2>Why this matters most for public records</H2>
      <p>
        Government releases are the classic mixed bag: a single FOIA production can contain native-text pages, OCR&apos;d scans, and raw image scans all in one file. That mixture used to be the worst case, because the searchable pages hid the fact that other pages were silently unsearchable. Handling it per page — real text where it exists, OCR where it doesn&apos;t — is exactly what <Link href="/search-government-documents" className="text-[var(--accent)] hover:underline">searching government documents</Link> demands. Once the text exists, everything normal applies: <Link href="/how-to-search-pdf" className="text-[var(--accent)] hover:underline">the basics</Link>, searching across <Link href="/search-multiple-pdfs" className="text-[var(--accent)] hover:underline">many files at once</Link>, exact matching, all of it.
      </p>
    </BlogPost>
  );
}
