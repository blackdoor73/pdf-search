import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/seo/ContentPage";
import { absUrl } from "@/lib/seo/site";

const UPDATED = "2026-09-11";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What PDFSearch collects and what it doesn't. Your PDF files are processed entirely in your browser and are never uploaded to our servers.",
  alternates: { canonical: absUrl("/privacy") },
  openGraph: {
    title: "Privacy Policy — PDFSearch",
    description:
      "What PDFSearch collects and what it doesn't. Your PDF files never leave your browser.",
    url: absUrl("/privacy"),
  },
};

export default function PrivacyPage() {
  return (
    <ContentPage
      eyebrow="Legal"
      title="Privacy Policy"
      intro="PDFSearch is built so that your documents stay yours. This page explains exactly what happens to your files, what limited data we do collect, and how to opt out of it."
      breadcrumbLabel="Privacy Policy"
      path="/privacy"
      updated={UPDATED}
    >
      <h2>The short version</h2>
      <ul>
        <li>
          <strong>Your PDF files are never uploaded to us.</strong> They are opened and
          searched entirely inside your browser.
        </li>
        <li>
          We collect <strong>anonymous usage analytics</strong> — including limited
          document metadata and search terms, described in full below.
        </li>
        <li>There are no accounts, and we never ask for your name or address.</li>
        <li>
          We honour <code>Do Not Track</code> and <code>Global Privacy Control</code>. If
          either is enabled, analytics are switched off entirely.
        </li>
      </ul>

      <h2>How your PDFs are handled</h2>
      <p>
        When you add a PDF, it is read by your own browser using a JavaScript PDF engine.
        The text extraction, the search, and the optional OCR for scanned documents all run
        on your device. <strong>The contents of your files are never transmitted to us and
        are never stored anywhere.</strong> Closing the tab discards everything.
      </p>
      <p>
        You can verify this yourself: open your browser&apos;s developer tools, switch to
        the Network tab, and run a search. You will see no upload of your file.
      </p>
      <p>
        There is one exception, and it only applies when <strong>you</strong> choose it. If
        you add a PDF by pasting a URL rather than selecting a local file, our server has to
        fetch that URL on your behalf, because browsers block direct cross-site downloads.
        In that case the file passes through our server in memory so it can be handed to your
        browser. It is not written to disk and not retained. This never happens for files you
        select from your own device.
      </p>

      <h2>What we do collect</h2>
      <p>
        To understand whether the tool actually works for people, we record anonymous product
        analytics. We want to be specific rather than reassuring, so here is the full list.
      </p>

      <h3>Usage events</h3>
      <p>
        Page views, searches, file loads, errors, OCR runs, and exports. Each carries an
        anonymous identifier, a session identifier, and basic technical context: browser, OS,
        device type, language, timezone, referring page, and approximate country or city
        derived from your IP address.
      </p>

      <h3>Search terms</h3>
      <p>
        <strong>The words you type into the search box are recorded</strong> (truncated to
        120 characters), together with how many matches they returned. This tells us which
        searches fail so we can fix them. Please do not type confidential information into
        the search box if you would rather it not be recorded.
      </p>

      <h3>Document metadata</h3>
      <p>
        <strong>Not the contents of your file, but facts about it:</strong> the filename, its
        size, its page count, a cryptographic checksum, and any title, author, subject,
        keywords, creator, or producer fields embedded in the PDF by the software that made
        it. We use this to understand what kinds of documents people search and where the
        engine struggles.
      </p>

      <h3>Your IP address</h3>
      <p>
        We never store your raw IP address. It is converted into an irreversible keyed hash,
        used only to distinguish visitors and limit abuse. We do derive an approximate
        location from it before discarding it.
      </p>

      <h3>Feedback you send us</h3>
      <p>
        If you use the feedback or report button, we store your message, the page you were on,
        and your email address if you chose to provide one. Bug reports may include technical
        details about your search — the query, your search options, and per-file information
        such as page counts and whether a text layer was found. If you tick the optional box to
        include a short text excerpt, that excerpt is sent too. That box is off by default, and
        the report screen shows you exactly what will be sent before you send it.
      </p>

      <h2>What we never collect</h2>
      <ul>
        <li>The contents of your PDF files.</li>
        <li>Your name, postal address, or payment details.</li>
        <li>Your raw IP address.</li>
        <li>Cross-site tracking data. We do not sell or share data with data brokers.</li>
      </ul>

      <h2>Cookies and local storage</h2>
      <p>
        We use a small number of first-party cookies and browser storage entries, listed in
        full below. Advertising, where it runs, is covered in its own section further down.
      </p>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Purpose</th>
            <th>Retention</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>pdfsearch_session</td>
            <td>Cookie</td>
            <td>Anonymous visitor identifier for analytics</td>
            <td>90 days</td>
          </tr>
          <tr>
            <td>pdfsearch_history</td>
            <td>Cookie</td>
            <td>
              Your recent filenames, URLs, and searches, so they reappear when you return.
              Stays on your device.
            </td>
            <td>90 days</td>
          </tr>
          <tr>
            <td>pdfsearch_anon_id</td>
            <td>Local storage</td>
            <td>Mirror of the visitor identifier, so it survives cookie loss</td>
            <td>Until cleared</td>
          </tr>
          <tr>
            <td>pdfsearch_session_state</td>
            <td>Local storage</td>
            <td>Groups activity into a session; expires after 30 minutes idle</td>
            <td>Until cleared</td>
          </tr>
          <tr>
            <td>pdfsearch:onboarded</td>
            <td>Local storage</td>
            <td>Remembers that you have seen the first-visit tip</td>
            <td>Until cleared</td>
          </tr>
          <tr>
            <td>pdfsearch:changelog-seen</td>
            <td>Local storage</td>
            <td>Remembers which updates you have already read</td>
            <td>Until cleared</td>
          </tr>
          <tr>
            <td>pdfsearch:ads</td>
            <td>Local storage</td>
            <td>Remembers that you switched advertising off</td>
            <td>Until cleared</td>
          </tr>
        </tbody>
      </table>

      <h2>Third-party services</h2>
      <p>
        We use <strong>Google Analytics</strong> and <strong>Microsoft Clarity</strong> to
        measure traffic and spot usability problems, with IP anonymisation enabled. Analytics
        data is stored in a <strong>Neon</strong> database, the site is hosted on{" "}
        <strong>Vercel</strong>, feedback notifications are delivered by{" "}
        <strong>Resend</strong>, and advertising — when enabled — is served by{" "}
        <strong>Google AdSense</strong>. These providers process the data described above on our
        behalf. They never receive your PDF files, because your PDF files never leave your
        browser.
      </p>

      <h2>Advertising</h2>
      <p>
        PDFSearch may show <strong>a single advertisement in the right margin on wide desktop
        screens</strong>, supplied by Google AdSense. There is never an ad on mobile, never one
        inside your search results, and never a pop-up or interstitial.
      </p>
      <p>
        Where an ad is shown, Google may set its own cookies and use them to measure and
        personalise advertising. Google&apos;s use of data is described in its{" "}
        <a
          href="https://policies.google.com/technologies/partner-sites"
          target="_blank"
          rel="noopener noreferrer"
        >
          partner-sites policy
        </a>
        , and you can control personalisation at{" "}
        <a
          href="https://myadcenter.google.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google My Ad Center
        </a>
        .
      </p>
      <p>
        <strong>Advertisers never receive your documents.</strong> Your PDFs are not uploaded
        anywhere, so there is nothing about their contents for an ad network to see.
      </p>
      <p>
        You can switch advertising off at any time on the{" "}
        <Link href="/support">support page</Link>, or from the link beneath the ad itself. When
        it is off, <strong>the advertising script is not loaded at all</strong> — it is not
        merely hidden — so no ad cookies are set and no request is made to an ad server.
      </p>
      <p>
        Visitors in the EEA, the UK, and Switzerland are asked for consent before any
        personalised advertising cookie is set, through a consent tool certified by Google. You
        can change that choice at any time from the same support page.
      </p>

      <h2>How to opt out</h2>
      <ul>
        <li>
          Enable <strong>Do Not Track</strong> or <strong>Global Privacy Control</strong> in
          your browser. We check both, and analytics stop entirely — no configuration needed
          on our side.
        </li>
        <li>
          Turn advertising off on the <Link href="/support">support page</Link>. The ad script
          is then never downloaded.
        </li>
        <li>Use a content blocker. We do not attempt to detect or defeat them.</li>
        <li>
          Clear your site data in your browser to delete every cookie and storage entry listed
          above.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Depending on where you live — including under the EU/UK GDPR and India&apos;s Digital
        Personal Data Protection Act — you may have the right to access, correct, or delete
        your personal data, to withdraw consent, and to complain to a data protection
        authority.
      </p>
      <p>
        Because everything we hold is anonymous, we usually cannot connect stored records to
        you as an individual, which genuinely limits what we can retrieve on request. If you
        contact us and can identify the relevant records — for example the email address you
        used to send feedback — we will delete them.
      </p>

      <h2>Data retention</h2>
      <p>
        Anonymous analytics events are kept for up to 24 months. Feedback submissions are kept
        until resolved and reviewed, and deleted on request.
      </p>

      <h2>Children</h2>
      <p>
        PDFSearch is a general-purpose document tool and is not directed at children. We do not
        knowingly collect personal data from children.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If this policy changes in a way that affects what we collect, we will update the date
        at the top of this page and describe the change in the{" "}
        <Link href="/changelog">changelog</Link>.
      </p>

      <h2>Contact</h2>
      <p>
        PDFSearch is operated by an individual developer based in India. For any privacy
        question or request, use the <Link href="/contact">contact page</Link> or the feedback
        button in the corner of any page.
      </p>
    </ContentPage>
  );
}
