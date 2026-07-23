/**
 * Canonical registry of every indexable public page.
 *
 * Feeds sitemap.ts, the SiteFooter sitemap columns, and RelatedPages
 * defaults — one list, no drift. `lastModified` is hand-maintained: bump
 * it only when a page's *content* meaningfully changes (a build date on
 * every URL tells crawlers nothing).
 */

export type PageGroup = "tool" | "persona" | "guide" | "product";

export interface PublicPage {
  path: string;
  title: string;
  shortDescription: string;
  group: PageGroup;
  /** ISO date of last meaningful content change. */
  lastModified: string;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  priority: number;
}

export const publicPages: PublicPage[] = [
  // ── Tools (feature-intent landing pages) ──────────────────────────────
  {
    path: "/how-to-search-pdf",
    title: "How to Search a PDF",
    shortDescription: "Step-by-step guide to searching inside any PDF file.",
    group: "tool",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/search-multiple-pdfs",
    title: "Search Multiple PDFs",
    shortDescription: "Run one search across up to 200 PDF files at once.",
    group: "tool",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/pdf-search-online",
    title: "PDF Search Online",
    shortDescription: "Search PDFs in your browser — no install, no upload.",
    group: "tool",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/search-text-in-pdf",
    title: "Search Text in PDF",
    shortDescription: "Find any word or phrase inside PDF documents instantly.",
    group: "tool",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/find-words-in-pdf",
    title: "Find Words in PDF",
    shortDescription: "Locate every occurrence of a word with page numbers.",
    group: "tool",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.85,
  },
  {
    path: "/free-pdf-search-engine",
    title: "Free PDF Search Engine",
    shortDescription: "A free, private search engine for your own PDF files.",
    group: "tool",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/search-scanned-pdf",
    title: "Search Scanned PDFs",
    shortDescription: "What works (and what doesn't) when PDFs are scans.",
    group: "tool",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/bulk-pdf-search",
    title: "Bulk PDF Search",
    shortDescription: "Batch-search entire folders of PDFs in one pass.",
    group: "tool",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.8,
  },

  // ── Personas (audience-intent landing pages) ──────────────────────────
  {
    path: "/pdf-search-for-students",
    title: "PDF Search for Students",
    shortDescription: "Search textbooks, lecture notes, and readings for exam prep.",
    group: "persona",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.75,
  },
  {
    path: "/pdf-search-for-researchers",
    title: "PDF Search for Researchers",
    shortDescription: "Search across dozens of papers for methods and citations.",
    group: "persona",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.75,
  },
  {
    path: "/pdf-search-for-lawyers",
    title: "PDF Search for Lawyers",
    shortDescription: "Search discovery, contracts, and transcripts confidentially.",
    group: "persona",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.75,
  },
  {
    path: "/pdf-search-for-finance",
    title: "PDF Search for Finance",
    shortDescription: "Search 10-Ks, filings, and reports for line items and terms.",
    group: "persona",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/pdf-search-for-recruiters",
    title: "PDF Search for Recruiters",
    shortDescription: "Search batches of résumés for skills and keywords.",
    group: "persona",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/pdf-search-for-engineers",
    title: "PDF Search for Engineers",
    shortDescription: "Search datasheets and specs for part numbers, exactly.",
    group: "persona",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/search-government-documents",
    title: "Search Government Documents",
    shortDescription: "Search FOIA releases and public records privately.",
    group: "persona",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/search-technical-manuals",
    title: "Search Technical Manuals",
    shortDescription: "Find error codes and procedures in product manuals.",
    group: "persona",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.7,
  },

  // ── Guides (blog) ─────────────────────────────────────────────────────
  {
    path: "/blog",
    title: "Blog",
    shortDescription: "Guides and deep dives on PDF search workflows.",
    group: "guide",
    lastModified: "2026-07-23",
    changeFrequency: "weekly",
    priority: 0.7,
  },
  {
    path: "/blog/search-multiple-pdfs-online",
    title: "How to Search Multiple PDFs Online",
    shortDescription: "Tutorial: one search across a whole folder of PDFs.",
    group: "guide",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.65,
  },
  {
    path: "/blog/ctrlf-vs-advanced-pdf-search",
    title: "Ctrl+F vs Advanced PDF Search",
    shortDescription: "Where the browser's find-in-page falls short.",
    group: "guide",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.65,
  },
  {
    path: "/blog/best-pdf-search-tools",
    title: "Best PDF Search Tools",
    shortDescription: "An honest comparison of ways to search PDF files.",
    group: "guide",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.65,
  },
  {
    path: "/blog/how-lawyers-search-500-page-pdfs",
    title: "How Lawyers Search 500-Page PDFs",
    shortDescription: "A confidential, in-browser workflow for legal documents.",
    group: "guide",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.65,
  },
  {
    path: "/blog/pdf-search-workflow-for-students",
    title: "A PDF Search Workflow for Students",
    shortDescription: "Turn a semester of PDFs into a searchable study aid.",
    group: "guide",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.65,
  },
  {
    path: "/blog/how-to-search-scanned-pdfs",
    title: "How to Search Scanned PDFs",
    shortDescription: "The text-layer test and a practical OCR pipeline.",
    group: "guide",
    lastModified: "2026-07-23",
    changeFrequency: "monthly",
    priority: 0.65,
  },

  // ── Product ───────────────────────────────────────────────────────────
  {
    path: "/changelog",
    title: "Changelog",
    shortDescription: "What's new in PDFSearch — recent updates and fixes.",
    group: "product",
    lastModified: "2026-07-23",
    changeFrequency: "weekly",
    priority: 0.5,
  },
];

export function pagesByGroup(group: PageGroup): PublicPage[] {
  return publicPages.filter((p) => p.group === group);
}

export function getPage(path: string): PublicPage | undefined {
  return publicPages.find((p) => p.path === path);
}
