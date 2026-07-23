import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedPages, type RelatedLink } from "@/components/seo/RelatedPages";
import { SiteFooter } from "@/components/seo/SiteFooter";
import { articleSchema, breadcrumbSchema } from "@/lib/seo/site";

/**
 * Shared chrome for blog posts: header, breadcrumb (visual + schema),
 * Article schema, related links, and the sitemap footer. New posts pass
 * their prose as children so every post shares one consistent shell.
 */
export function BlogPost({
  slug,
  title,
  description,
  tags,
  dateISO,
  dateLabel,
  readTime,
  related,
  children,
}: {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  dateISO: string;
  dateLabel: string;
  readTime: string;
  related: RelatedLink[];
  children: ReactNode;
}) {
  const path = `/blog/${slug}`;
  return (
    <div className="min-h-screen bg-[var(--bg)] grid-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            articleSchema({ title, description, path, datePublished: dateISO })
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Blog", path: "/blog" },
              { name: title, path },
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
            { name: "Blog", path: "/blog" },
            { name: title, path: "" },
          ]}
        />

        <article>
          <header className="mb-8">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="font-mono text-[9px] uppercase tracking-wider text-[var(--accent)] bg-[var(--surface2)] border border-[var(--border)] px-1.5 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="font-mono text-3xl sm:text-4xl font-semibold text-[var(--text)] leading-tight mb-4">
              {title}
            </h1>
            <p className="font-sans text-base text-[var(--text-2)] leading-relaxed mb-4">
              {description}
            </p>
            <div className="flex items-center gap-3 font-mono text-[10px] text-[var(--text-3)]">
              <span>{dateLabel}</span>
              <span>·</span>
              <span>{readTime}</span>
            </div>
          </header>

          <div className="space-y-6 font-sans text-sm text-[var(--text-2)] leading-relaxed">
            {children}

            <div className="card p-6 mt-8 text-center">
              <h2 className="font-mono text-base font-semibold text-[var(--text)] mb-2">
                Search your own PDFs now
              </h2>
              <p className="font-sans text-xs text-[var(--text-2)] mb-4">
                Free, instant, and private — nothing ever leaves your browser.
              </p>
              <Link
                href="/"
                className="btn-primary inline-flex items-center gap-2 py-2.5 px-5 font-mono text-xs font-semibold"
              >
                Try PDFSearch Free
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </article>

        <div className="mt-12">
          <RelatedPages heading="Keep reading" links={related} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/** Section heading used inside post bodies. */
export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-mono text-xl font-semibold text-[var(--text)] mt-8">
      {children}
    </h2>
  );
}
