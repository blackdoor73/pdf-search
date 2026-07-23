/**
 * Single source of truth for the canonical site origin and shared
 * Schema.org JSON-LD builders. Import from here instead of hardcoding
 * the URL — the string was previously duplicated across ~10 files.
 */

export const siteUrl = "https://www.pdfsearch.info";

export function absUrl(path: string): string {
  if (path === "/" || path === "") return siteUrl;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absUrl(item.path),
    })),
  };
}

export function articleSchema(opts: {
  title: string;
  description: string;
  path: string;
  datePublished: string; // ISO date
  dateModified?: string; // ISO date
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    url: absUrl(opts.path),
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    author: { "@type": "Organization", name: "PDFSearch", url: siteUrl },
    publisher: {
      "@type": "Organization",
      name: "PDFSearch",
      logo: { "@type": "ImageObject", url: `${siteUrl}/icon.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": absUrl(opts.path) },
    image: `${siteUrl}/opengraph-image`,
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}
