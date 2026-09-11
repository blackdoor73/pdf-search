import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/seo/ContentPage";
import { absUrl } from "@/lib/seo/site";

const UPDATED = "2026-09-11";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for using PDFSearch — a free, in-browser PDF search tool. Plain language, no surprises.",
  alternates: { canonical: absUrl("/terms") },
  openGraph: {
    title: "Terms of Service — PDFSearch",
    description: "The terms for using PDFSearch, in plain language.",
    url: absUrl("/terms"),
  },
};

export default function TermsPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Terms of Service"
      intro="PDFSearch is a free tool provided as-is by an individual developer. These terms are deliberately short and written in plain language."
      breadcrumbLabel="Terms of Service"
      path="/terms"
      updated={UPDATED}
    >
      <h2>Using PDFSearch</h2>
      <p>
        PDFSearch is free to use, with no account required. By using it you agree to these
        terms. If you do not agree, please do not use the site.
      </p>

      <h2>What you may not do</h2>
      <ul>
        <li>
          Use the site to process documents you have no legal right to access or search.
        </li>
        <li>
          Use the URL-loading feature to attack, scan, or probe systems you do not own. The
          server that fetches URLs on your behalf is rate-limited and restricted to public
          web addresses.
        </li>
        <li>
          Attempt to disrupt the service, circumvent its limits, or automate abusive volumes
          of traffic.
        </li>
        <li>Use the site for anything unlawful.</li>
      </ul>

      <h2>Your documents and your responsibility</h2>
      <p>
        Your files are processed in your own browser, so you retain complete ownership and
        control of them. We claim no rights over anything you search. You are responsible for
        ensuring you are permitted to handle the documents you use with this tool — that
        matters particularly for confidential, privileged, or regulated material.
      </p>

      <h2>Service limits</h2>
      <p>
        The tool runs on your device, so its practical limits depend on your hardware.
        Published limits — such as the number of files, per-file size, and OCR page budgets —
        exist to keep your browser responsive and may change as the product improves. OCR for
        scanned documents is inherently imperfect and may misread text.
      </p>

      <h2>Availability</h2>
      <p>
        This is a free service maintained by one person. It may be unavailable, change, or be
        discontinued at any time without notice. Because searching happens in your browser, a
        temporary outage of our site does not put your files at risk.
      </p>

      <h2>No warranty</h2>
      <p>
        PDFSearch is provided <strong>&ldquo;as is&rdquo;, without warranty of any kind</strong>,
        express or implied, including any warranty of merchantability, fitness for a particular
        purpose, accuracy, or non-infringement.
      </p>
      <p>
        Search results depend on the structure of your PDFs. A document with no text layer, an
        unusual encoding, or poor scan quality may return incomplete results.{" "}
        <strong>Do not rely on this tool alone where completeness is critical</strong> — for
        example in legal discovery, regulatory filings, or medical contexts. Verify anything
        that matters.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, the operator of PDFSearch will not be liable
        for any indirect, incidental, or consequential damages, or for any loss arising from
        your use of, or inability to use, this site — including decisions made on the basis of
        search results.
      </p>
      <p>
        Nothing in these terms excludes liability that cannot lawfully be excluded. Some
        jurisdictions do not allow certain exclusions, so parts of this section may not apply
        to you.
      </p>

      <h2>Third-party content</h2>
      <p>
        When you load a PDF by URL, that document comes from a third party and we have no
        control over, and accept no responsibility for, its content. Links to other sites are
        provided for convenience only.
      </p>

      <h2>Privacy</h2>
      <p>
        Our handling of data is described in the <Link href="/privacy">Privacy Policy</Link>,
        which forms part of these terms.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may be updated. Material changes will be reflected in the date above.
        Continuing to use the site after a change means you accept the updated terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent through the{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    </ContentPage>
  );
}
