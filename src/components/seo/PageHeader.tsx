import { ShieldCheck } from "lucide-react";

/**
 * Sticky site header for standalone content pages (legal, support, roadmap).
 *
 * The homepage and the landing shell each own a header with extra controls
 * (WhatsNew, shortcuts, the ⌘K hint), so this is deliberately the reduced
 * variant rather than a shared abstraction over all three — unifying them
 * would mean threading half a dozen optional props through every caller.
 */
export function PageHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Intentional full-page reload — bypasses Next.js Link prefetch */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="flex items-center gap-3 shrink-0"
          aria-label="Reload PDFSearch home"
        >
          <div className="w-7 h-7 bg-[var(--accent)] flex items-center justify-center">
            <span className="font-mono text-[10px] font-bold text-black">PDF</span>
          </div>
          <span className="font-mono text-base font-semibold text-[var(--text)]">
            Search<span className="text-[var(--accent)]">.</span>
          </span>
        </a>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--green)]" />
          <span className="hidden sm:inline font-mono text-xs text-[var(--text-3)]">
            Files never stored
          </span>
        </div>
      </div>
    </header>
  );
}
