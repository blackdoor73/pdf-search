import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/seo/ContentPage";
import { absUrl } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch about PDFSearch — bug reports, feature requests, privacy questions, or business enquiries.",
  alternates: { canonical: absUrl("/contact") },
  openGraph: {
    title: "Contact — PDFSearch",
    description: "Get in touch about PDFSearch.",
    url: absUrl("/contact"),
  },
};

export default function ContactPage() {
  return (
    <ContentPage
      eyebrow="Contact"
      title="Get in touch"
      intro="PDFSearch is maintained by one developer who reads everything that comes in. The fastest way to reach me is the feedback button in the corner of any page."
      breadcrumbLabel="Contact"
      path="/contact"
    >
      <h2>The feedback button</h2>
      <p>
        Every page has a <strong>Feedback</strong> button in the bottom-right corner. It opens
        a short form — pick a category, write a sentence, send. No account, and an email
        address is optional. Leave one only if you would like a reply.
      </p>

      <h2>Reporting a search that did not work</h2>
      <p>
        If a search returned nothing you expected, use the <strong>Report</strong> button that
        appears next to the results instead. It attaches the technical context that makes the
        problem diagnosable — your query, the search options you used, and per-file details
        such as page counts and whether a text layer was found.
      </p>
      <p>
        It never includes your document. There is an optional tick-box to add a short text
        excerpt, off by default, and the form shows you exactly what will be sent before you
        send it. Reports with that context attached are far more likely to get fixed, because
        most search failures come down to how a specific PDF was produced.
      </p>

      <h2>Feature requests</h2>
      <p>
        Send them through the feedback form with the <strong>Feature request</strong> category.
        Requests that come up repeatedly get added to the{" "}
        <Link href="/roadmap">public roadmap</Link>, where anyone can vote on them. Voting is
        what decides the order things get built in.
      </p>

      <h2>Privacy requests</h2>
      <p>
        For any question about data — or to ask for something to be deleted — use the feedback
        form and choose <strong>Other</strong>. Please include enough detail to identify the
        records, such as the email address you originally wrote in. What we store and what we
        can retrieve is described in the <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Business and press</h2>
      <p>
        For team deployments, self-hosting, integrations, partnerships, or press, use the
        feedback form with the <strong>Other</strong> category and include your email address.
        Enquiries from people who need this working inside an organisation are genuinely
        useful and get answered first.
      </p>

      <h2>Response times</h2>
      <p>
        This is a side project, so replies are not instant — usually within a few days. Bug
        reports that include diagnostics tend to get acted on fastest, and you will often see
        the result appear in the <Link href="/changelog">changelog</Link>.
      </p>
    </ContentPage>
  );
}
