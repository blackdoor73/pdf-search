import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/seo/ContentPage";
import { absUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "About PDFSearch",
  description:
    "Why PDFSearch runs entirely in your browser, who builds it, and how it is funded. A free PDF search tool made by one developer.",
  alternates: { canonical: absUrl("/about") },
  openGraph: {
    title: "About PDFSearch",
    description:
      "Why PDFSearch runs entirely in your browser, who builds it, and how it is funded.",
    url: absUrl("/about"),
  },
};

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="About"
      title="About PDFSearch"
      intro="A free tool for searching across many PDF files at once — built by one developer, and designed so your documents never leave your computer."
      breadcrumbLabel="About"
      path="/about"
    >
      <h2>The problem</h2>
      <p>
        Ctrl+F searches one open document. That is fine until you have forty of them: a
        semester of lecture notes, a folder of contracts, a batch of résumés, a public-records
        release. Then the options get worse. Desktop search tools need installing and
        indexing. Cloud tools want you to upload everything first — a non-starter if the
        documents are confidential, and slow even when they are not.
      </p>

      <h2>The approach</h2>
      <p>
        PDFSearch loads the PDF engine into your browser and searches there. Nothing is
        uploaded, nothing is stored, and there is no account to create. You drop in files,
        type a word, and get every match with its page number.
      </p>
      <p>
        This has a real trade-off worth being honest about: the work happens on your device,
        so a very large batch is limited by your own hardware rather than by a server farm.
        In exchange, your documents stay private by architecture rather than by promise, and
        you can verify it in your browser&apos;s network tab.
      </p>

      <h2>What it does well</h2>
      <ul>
        <li>Searches many PDFs at once, ranked by how many matches each contains.</li>
        <li>Exact, whole-word, and case-sensitive matching for precise lookups.</li>
        <li>
          Reads scanned documents with in-browser OCR in ten languages, including Hindi and
          Chinese.
        </li>
        <li>Loads files from your device or from a URL, and exports results as CSV.</li>
      </ul>

      <h2>What it does not do</h2>
      <p>
        PDFSearch is a text-search tool, not an AI product. It does not summarise documents,
        answer questions about them, or chat with them. It finds the words you asked for and
        shows you where they are. If you need a summariser, this is not that tool — and
        pretending otherwise would waste your time.
      </p>

      <h2>Who builds it</h2>
      <p>
        PDFSearch is designed, built, and maintained by a single independent developer based
        in India. There is no company behind it, no investors, and no team — which is why the
        changelog moves in bursts and why your feedback genuinely changes what gets built
        next.
      </p>

      <h2>How it is funded</h2>
      <p>
        Running the site costs money: hosting, domains, and the time to maintain it. The tool
        itself is free and the core search will stay free — no metering, no locked results, no
        trial that expires.
      </p>
      <p>
        If you find it useful and want to help keep it running, the{" "}
        <Link href="/support">support page</Link> explains the ways you can. Supporting is
        entirely optional and nothing is withheld from people who do not.
      </p>

      <h2>Using it at work</h2>
      <p>
        Teams in legal, compliance, research, and recruitment use PDFSearch precisely because
        documents never leave the device. If you need something this does not do yet — a
        self-hosted deployment, a larger batch size, or a specific workflow — please get in
        touch through the <Link href="/contact">contact page</Link>. Those conversations
        directly shape the roadmap.
      </p>

      <h2>Where to go next</h2>
      <ul>
        <li>
          <Link href="/">Try the tool</Link> — no signup, nothing to install.
        </li>
        <li>
          <Link href="/roadmap">Roadmap</Link> — see what is planned and vote on it.
        </li>
        <li>
          <Link href="/changelog">Changelog</Link> — what shipped recently.
        </li>
        <li>
          <Link href="/privacy">Privacy policy</Link> — exactly what is and is not collected.
        </li>
      </ul>
    </ContentPage>
  );
}
