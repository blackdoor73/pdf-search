import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { BreadcrumbItem } from "@/lib/seo/site";

/**
 * Visual breadcrumb trail backing the BreadcrumbList JSON-LD (Google wants
 * the schema supported by visible navigation). Last item is the current
 * page and is not a link.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center flex-wrap gap-1 font-mono text-[11px]">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight className="w-3 h-3 text-[var(--text-3)]" aria-hidden />
              )}
              {isLast ? (
                <span aria-current="page" className="text-[var(--text-2)]">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.path}
                  className="text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
