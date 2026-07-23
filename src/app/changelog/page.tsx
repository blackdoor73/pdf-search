import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SiteFooter } from "@/components/seo/SiteFooter";
import { absUrl, breadcrumbSchema } from "@/lib/seo/site";
import { changelog, type ChangelogTag } from "@/lib/changelog";

export const metadata: Metadata = {
  title: "Changelog — What's New in PDFSearch",
  description:
    "Recent updates, improvements, and fixes to PDFSearch — the free, private, in-browser PDF search tool.",
  alternates: { canonical: absUrl("/changelog") },
  openGraph: {
    title: "Changelog — What's New in PDFSearch",
    description: "Recent updates, improvements, and fixes to PDFSearch.",
    url: absUrl("/changelog"),
  },
};

const TAG_STYLE: Record<ChangelogTag, string> = {
  new: "text-[var(--green)] border-[var(--green)]",
  improved: "text-[var(--accent)] border-[var(--accent)]",
  fixed: "text-[var(--blue)] border-[var(--blue)]",
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] grid-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Changelog", path: "/changelog" },
            ])
          ),
        }}
      />

      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="flex items-center gap-3 shrink-0" aria-label="Reload PDFSearch home">
            <div className="w-7 h-7 bg-[var(--accent)] flex items-center justify-center">
              <span className="font-mono text-[10px] font-bold text-black">PDF</span>
            </div>
            <span className="font-mono text-base font-semibold text-[var(--text)]">
              Search<span className="text-[var(--accent)]">.</span>
            </span>
          </a>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--green)]" />
            <span className="hidden sm:inline font-mono text-xs text-[var(--text-3)]">Files never stored</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Breadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Changelog", path: "" },
          ]}
        />

        <div className="mb-10">
          <p className="font-mono text-[11px] text-[var(--accent)] uppercase tracking-widest mb-2">
            Product Updates
          </p>
          <h1 className="font-mono text-3xl sm:text-4xl font-semibold text-[var(--text)] mb-3">
            Changelog
          </h1>
          <p className="font-sans text-sm text-[var(--text-2)] max-w-xl leading-relaxed">
            What&apos;s new in PDFSearch. It&apos;s a free tool built in the open — here&apos;s what has changed recently.
          </p>
        </div>

        <div className="space-y-10">
          {changelog.map((entry) => (
            <article key={entry.date} className="relative pl-6 border-l border-[var(--border)]">
              <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-[var(--accent)]" />
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span
                  className={`font-mono text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${TAG_STYLE[entry.tag]}`}
                >
                  {entry.tag}
                </span>
                <time className="font-mono text-[10px] text-[var(--text-3)]" dateTime={entry.date}>
                  {new Date(entry.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>
              <h2 className="font-mono text-lg font-semibold text-[var(--text)] mb-3">
                {entry.title}
              </h2>
              <ul className="space-y-1.5 font-sans text-sm text-[var(--text-2)] leading-relaxed list-disc pl-5">
                {entry.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-12">
          <Link href="/" className="font-mono text-xs text-[var(--accent)] hover:underline">
            ← Back to PDFSearch
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
