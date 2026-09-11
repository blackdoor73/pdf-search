import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SiteFooter } from "@/components/seo/SiteFooter";
import { PageHeader } from "@/components/seo/PageHeader";
import { VoteBoard } from "@/components/roadmap/VoteBoard";
import { absUrl, breadcrumbSchema } from "@/lib/seo/site";
import { getFeatureRequests } from "@/lib/roadmap/queries";

export const metadata: Metadata = {
  title: "Roadmap — What's Next for PDFSearch",
  description:
    "See what's planned for PDFSearch and vote on the features that matter most to you. No account needed.",
  alternates: { canonical: absUrl("/roadmap") },
  openGraph: {
    title: "Roadmap — What's Next for PDFSearch",
    description: "See what's planned for PDFSearch and vote on what matters to you.",
    url: absUrl("/roadmap"),
  },
};

/**
 * Vote counts change as people vote, so this must not be baked in at build
 * time. Revalidating hourly keeps the page static-fast while staying roughly
 * current; the client reconciles exact counts on interaction anyway.
 */
export const revalidate = 3600;

export default async function RoadmapPage() {
  const features = await getFeatureRequests();

  return (
    <div className="min-h-screen bg-[var(--bg)] grid-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Roadmap", path: "/roadmap" },
            ])
          ),
        }}
      />

      <PageHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Breadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Roadmap", path: "" },
          ]}
        />

        <div className="mb-10">
          <p className="font-mono text-[11px] text-[var(--accent)] uppercase tracking-widest mb-2">
            Roadmap
          </p>
          <h1 className="font-mono text-3xl sm:text-4xl font-semibold text-[var(--text)] mb-3">
            What&apos;s next
          </h1>
          <p className="font-sans text-sm text-[var(--text-2)] leading-relaxed max-w-xl">
            PDFSearch is built by one developer, so the order things get built in matters.
            Vote for what you need — no account, one vote per person per idea.
          </p>
        </div>

        {features.length > 0 ? (
          <VoteBoard features={features} />
        ) : (
          <div className="card p-8 text-center">
            <p className="font-mono text-sm text-[var(--text-2)] mb-2">
              The board is being set up.
            </p>
            <p className="font-sans text-sm text-[var(--text-3)] leading-relaxed">
              Ideas here come from what people actually ask for. Send yours with the feedback
              button and it may well end up on this page.
            </p>
          </div>
        )}

        <div className="card p-5 mt-10">
          <h2 className="font-mono text-sm font-semibold text-[var(--text)] mb-2">
            Don&apos;t see your idea?
          </h2>
          <p className="font-sans text-sm text-[var(--text-2)] leading-relaxed">
            Use the <strong className="text-[var(--text)]">Feedback</strong> button in the
            corner of any page and choose &ldquo;Feature request&rdquo;. Requests that come up
            more than once get added here for everyone to vote on.
          </p>
        </div>

        <div className="mt-12 flex items-center gap-5 flex-wrap">
          <Link href="/" className="font-mono text-xs text-[var(--accent)] hover:underline">
            ← Back to PDFSearch
          </Link>
          <Link href="/changelog" className="font-mono text-xs text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
            See what already shipped →
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
