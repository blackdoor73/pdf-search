import Link from "next/link";
import { pagesByGroup } from "@/lib/seo/pages";

/**
 * Full sitemap footer for landing/blog/content pages, fed by the canonical
 * page registry so new pages appear automatically. Replaces the previous
 * 4-link footer.
 */
export function SiteFooter() {
  const columns: { heading: string; links: { path: string; title: string }[] }[] = [
    { heading: "Tools", links: pagesByGroup("tool") },
    { heading: "For your work", links: pagesByGroup("persona") },
    { heading: "Guides", links: pagesByGroup("guide") },
    { heading: "Product", links: pagesByGroup("product") },
  ].filter((c) => c.links.length > 0);

  return (
    <footer className="border-t border-[var(--border)] mt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {columns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-3">
                {col.heading}
              </h2>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.path}>
                    <Link
                      href={l.path}
                      className="font-mono text-[11px] text-[var(--text-2)] hover:text-[var(--accent)] transition-colors"
                    >
                      {l.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3 mt-10 pt-6 border-t border-[var(--border)]">
          <Link
            href="/"
            className="font-mono text-xs text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
          >
            PDFSearch · Free PDF Search Tool
          </Link>
          <span className="font-mono text-[10px] text-[var(--text-3)]">
            Runs entirely in your browser
          </span>
        </div>
      </div>
    </footer>
  );
}
