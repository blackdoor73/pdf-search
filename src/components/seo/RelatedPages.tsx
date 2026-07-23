import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface RelatedLink {
  href: string;
  title: string;
  description: string;
}

/**
 * Cross-link grid used on landing pages and blog posts — the internal-link
 * mesh (previously pages only linked 2 siblings from the footer).
 */
export function RelatedPages({
  heading,
  links,
}: {
  heading: string;
  links: RelatedLink[];
}) {
  if (links.length === 0) return null;
  return (
    <section aria-label={heading}>
      <h2 className="font-mono text-2xl font-semibold text-[var(--text)] mb-6">
        {heading}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="card p-4 group block">
            <span className="font-mono text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors flex items-center gap-1.5">
              {l.title}
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <span className="font-sans text-xs text-[var(--text-2)] mt-1.5 block leading-relaxed">
              {l.description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
