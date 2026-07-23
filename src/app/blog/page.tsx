import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { SiteFooter } from "@/components/seo/SiteFooter";
import { absUrl, breadcrumbSchema } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "PDF Search Blog — Guides, Tips & Tools for Searching PDFs",
  description:
    "Guides, tutorials, and comparisons for searching inside PDF files. Learn how to search multiple PDFs, find text in documents, and use PDF search tools effectively.",
  alternates: {
    canonical: absUrl("/blog"),
  },
  openGraph: {
    title: "PDF Search Blog — Guides, Tips & Tools for Searching PDFs",
    description:
      "Guides and tutorials on how to search inside PDFs efficiently. Tips, comparisons, and use cases.",
    url: absUrl("/blog"),
  },
};

const posts = [
  {
    slug: "search-multiple-pdfs-online",
    title: "How to Search Across Multiple PDFs Instantly",
    description:
      "Step-by-step guide to searching multiple PDF files simultaneously online — free, with no software required.",
    date: "2025-04-15",
    readTime: "5 min read",
    tags: ["guide", "multiple PDFs", "tutorial"],
  },
  {
    slug: "ctrlf-vs-advanced-pdf-search",
    title: "Ctrl+F vs Advanced PDF Search Tools — What's the Difference?",
    description:
      "Ctrl+F is great for one file. Here's what you need when you have dozens of PDFs and one question.",
    date: "2025-04-08",
    readTime: "4 min read",
    tags: ["comparison", "tips", "productivity"],
  },
  {
    slug: "best-pdf-search-tools",
    title: "Best Tools to Search Large PDF Collections in 2025",
    description:
      "A practical comparison of the best tools to search inside and across PDF files — from browser extensions to dedicated search engines.",
    date: "2025-04-01",
    readTime: "7 min read",
    tags: ["comparison", "tools", "roundup"],
  },
  {
    slug: "how-lawyers-search-500-page-pdfs",
    title: "How Lawyers Search 500-Page PDFs Without Uploading a Thing",
    description:
      "Discovery documents, contracts, and deposition transcripts — searched fast and kept confidential, because nothing leaves the browser.",
    date: "2026-07-23",
    readTime: "6 min read",
    tags: ["use case", "legal", "privacy"],
  },
  {
    slug: "pdf-search-workflow-for-students",
    title: "A PDF Search Workflow for Students (Textbooks, Notes, Exam Prep)",
    description:
      "Turn a semester of PDFs into a searchable study aid — find definitions, formulas, and citations across every file at once.",
    date: "2026-07-23",
    readTime: "5 min read",
    tags: ["use case", "students", "productivity"],
  },
  {
    slug: "how-to-search-scanned-pdfs",
    title: "How to Search Scanned PDFs (and When You Simply Can't)",
    description:
      "The text-layer test, what OCR actually does, and a practical pipeline for making image-only scans searchable.",
    date: "2026-07-23",
    readTime: "6 min read",
    tags: ["guide", "OCR", "scanned"],
  },
];

const blogListSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: posts.map((p, i) => ({
    "@type": "ListItem",
    position: i + 1,
    url: absUrl(`/blog/${p.slug}`),
    name: p.title,
  })),
};

const blogBreadcrumb = breadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Blog", path: "/blog" },
]);

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] grid-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogBreadcrumb) }}
      />
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="flex items-center gap-3 shrink-0" aria-label="Reload PDFSearch home">
            <div className="w-7 h-7 bg-[var(--accent)] flex items-center justify-center">
              <span className="font-mono text-[10px] font-bold text-black tracking-tight">PDF</span>
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <Breadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Blog", path: "" },
          ]}
        />
        <div className="mb-10">
          <p className="font-mono text-[11px] text-[var(--accent)] uppercase tracking-widest mb-2">
            Resource Hub
          </p>
          <h1 className="font-mono text-3xl sm:text-4xl font-semibold text-[var(--text)] mb-3">
            PDF Search Guides & Tips
          </h1>
          <p className="font-sans text-sm text-[var(--text-2)] max-w-xl leading-relaxed">
            Practical guides, tool comparisons, and tutorials for searching inside PDF documents — whether you have one file or thousands.
          </p>
        </div>

        <div className="grid gap-6">
          {posts.map((post) => (
            <article key={post.slug} className="card p-6 group">
              <Link href={`/blog/${post.slug}`} className="block">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="font-mono text-[9px] uppercase tracking-wider text-[var(--accent)] bg-[var(--surface2)] border border-[var(--border)] px-1.5 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h2 className="font-mono text-lg font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors mb-2">
                      {post.title}
                    </h2>
                    <p className="font-sans text-sm text-[var(--text-2)] leading-relaxed">
                      {post.description}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--text-3)] shrink-0 mt-1 group-hover:text-[var(--accent)] transition-colors" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-[var(--text-3)]">
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-[var(--border2)]">·</span>
                  <span className="font-mono text-[10px] text-[var(--text-3)]">{post.readTime}</span>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-12 card p-6 text-center">
          <h2 className="font-mono text-lg font-semibold text-[var(--text)] mb-2">
            Ready to search your PDFs?
          </h2>
          <p className="font-sans text-xs text-[var(--text-2)] mb-4">
            Free, instant, and 100% private — no account required.
          </p>
          <Link href="/" className="btn-primary inline-flex items-center gap-2 py-2.5 px-5 font-mono text-xs font-semibold">
            Search PDFs Free
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
