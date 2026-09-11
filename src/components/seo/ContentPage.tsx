import type { ReactNode } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SiteFooter } from "@/components/seo/SiteFooter";
import { PageHeader } from "@/components/seo/PageHeader";
import { breadcrumbSchema } from "@/lib/seo/site";

interface ContentPageProps {
  /** Small uppercase label above the h1. */
  eyebrow: string;
  title: string;
  /** Lede paragraph under the h1. */
  intro: string;
  /** Breadcrumb label + path used for both the visual trail and JSON-LD. */
  breadcrumbLabel: string;
  path: string;
  /** ISO date shown as "Last updated" — omit for pages where it adds nothing. */
  updated?: string;
  children: ReactNode;
}

/**
 * Shared shell for standalone prose pages (privacy, terms, about, contact,
 * support). Mirrors the changelog page's structure so these read as part of
 * the same site rather than bolted-on legal boilerplate.
 *
 * Body copy uses `.prose-page` (globals.css) so headings, lists, and links
 * are styled once rather than per page.
 */
export function ContentPage({
  eyebrow,
  title,
  intro,
  breadcrumbLabel,
  path,
  updated,
  children,
}: ContentPageProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)] grid-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: breadcrumbLabel, path },
            ])
          ),
        }}
      />

      <PageHeader />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Breadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: breadcrumbLabel, path: "" },
          ]}
        />

        <div className="mb-10">
          <p className="font-mono text-[11px] text-[var(--accent)] uppercase tracking-widest mb-2">
            {eyebrow}
          </p>
          <h1 className="font-mono text-3xl sm:text-4xl font-semibold text-[var(--text)] mb-3">
            {title}
          </h1>
          <p className="font-sans text-sm text-[var(--text-2)] leading-relaxed">
            {intro}
          </p>
          {updated && (
            <p className="font-mono text-[10px] text-[var(--text-3)] mt-4">
              Last updated{" "}
              <time dateTime={updated}>
                {new Date(updated).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </time>
            </p>
          )}
        </div>

        <div className="prose-page">{children}</div>

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
