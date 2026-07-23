import { MetadataRoute } from "next";
import { siteUrl, absUrl } from "@/lib/seo/site";
import { publicPages } from "@/lib/seo/pages";

/**
 * Driven by the canonical page registry (src/lib/seo/pages.ts) so the
 * sitemap, footer, and related-links never drift. lastModified is a real,
 * hand-maintained content date — not the build date, which told crawlers
 * every page changed on every deploy.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date("2026-07-23"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...publicPages.map((p) => ({
      url: absUrl(p.path),
      lastModified: new Date(p.lastModified),
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
  ];
}
