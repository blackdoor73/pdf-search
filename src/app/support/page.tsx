import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/seo/ContentPage";
import { absUrl } from "@/lib/seo/site";
import { AdPreference } from "@/components/ads/AdPreference";

export const metadata: Metadata = {
  title: "Support PDFSearch",
  description:
    "PDFSearch is free and built by one developer. If it saved you time, here are the ways you can help keep it running.",
  alternates: { canonical: absUrl("/support") },
  openGraph: {
    title: "Support PDFSearch",
    description:
      "PDFSearch is free and built by one developer. Here are the ways you can help keep it running.",
    url: absUrl("/support"),
  },
};

/**
 * Set NEXT_PUBLIC_PATREON_URL to switch the placeholder into a real link.
 * Unset (the current state) renders an honest "not set up yet" note rather
 * than a dead button.
 */
const PATREON_URL = process.env.NEXT_PUBLIC_PATREON_URL;

export default function SupportPage() {
  return (
    <ContentPage
      eyebrow="Support"
      title="Support PDFSearch"
      intro="PDFSearch is free, has no accounts, and never uploads your files. It is built and paid for by one developer. If it saved you time, here are the ways you can help."
      breadcrumbLabel="Support"
      path="/support"
    >
      <h2>Why this page exists</h2>
      <p>
        Hosting, domains, and maintenance cost money, and the time to build features costs
        rather more. There is no company behind this and no investors — so the honest options
        are a small number of people choosing to chip in, or advertising, or the project
        quietly stalling.
      </p>
      <p>
        The core search will stay free regardless. No metering, no truncated results, no trial
        that runs out. That is the whole point of the tool, and putting it behind a paywall
        would defeat it.
      </p>

      <h2>Ways to help that cost nothing</h2>
      <ul>
        <li>
          <strong>Tell someone.</strong> A colleague drowning in a folder of PDFs is the ideal
          audience, and word of mouth is how nearly everyone finds this.
        </li>
        <li>
          <strong>Send feedback.</strong> The feedback button on any page. Knowing what broke,
          or what is missing, is worth more than it sounds.
        </li>
        <li>
          <strong>Vote on the <Link href="/roadmap">roadmap</Link>.</strong> It decides what
          gets built next.
        </li>
        <li>
          <strong>Link to it</strong> from a blog post, a course page, or an answer where it
          genuinely helps.
        </li>
      </ul>

      <h2>Supporting financially</h2>
      {PATREON_URL ? (
        <>
          <p>
            If you would like to contribute, you can do so on Patreon. Any amount helps, and
            it is entirely optional.
          </p>
          <p>
            <a href={PATREON_URL} target="_blank" rel="noopener noreferrer nofollow">
              Support PDFSearch on Patreon →
            </a>
          </p>
        </>
      ) : (
        <p>
          A page for financial support is being set up and will appear here shortly. In the
          meantime, sharing the tool and sending feedback genuinely helps more than you would
          expect.
        </p>
      )}

      <h2>What supporters get</h2>
      <p>
        Nothing is taken away from people who do not support the project — no feature is locked
        and no limit is tightened. Supporting simply keeps the work going, and shapes it: if
        you support the project and ask for something, you will find me considerably more
        motivated to build it.
      </p>

      <h2>On advertising</h2>
      <p>
        If ads are running, it is <strong>one placement in the right margin on wide screens</strong>
        — never inside your search results, never on mobile, and never anything that interrupts
        you. The space it occupies is reserved whether or not an ad loads, so the page does not
        jump around.
      </p>
      <p>
        You can switch it off below, and switching it off means the ad script is never
        downloaded — not merely hidden. It is an honour-system setting: there is no check that
        you support the project, because building one would cost more than it is worth.
      </p>

      <AdPreference />

      <p>
        What is collected either way is described in the{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Using PDFSearch at work</h2>
      <p>
        If your team relies on this — or would, with one change — that is worth a conversation.
        Self-hosted deployments and organisation-specific workflows are the most likely way
        this becomes sustainable long-term. Get in touch through the{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    </ContentPage>
  );
}
