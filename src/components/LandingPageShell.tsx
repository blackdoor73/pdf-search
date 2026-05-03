import Link from "next/link";
import { CheckCircle, ArrowRight, ShieldCheck, Zap, Lock } from "lucide-react";

interface LandingPageShellProps {
  headline: string;
  subheadline: string;
  description: string;
  benefits: string[];
  howToSteps: { title: string; desc: string }[];
  faqItems: { question: string; answer: string }[];
  ctaText?: string;
  schemaMarkup?: object;
}

export function LandingPageShell({
  headline,
  subheadline,
  description,
  benefits,
  howToSteps,
  faqItems,
  ctaText = "Search PDFs Now — Free",
  schemaMarkup,
}: LandingPageShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)] grid-bg">
      {schemaMarkup && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 shrink-0" aria-label="PDFSearch home">
            <div className="w-7 h-7 bg-[var(--accent)] flex items-center justify-center">
              <span className="font-mono text-[10px] font-bold text-black tracking-tight">PDF</span>
            </div>
            <span className="font-mono text-base font-semibold text-[var(--text)]">
              Search<span className="text-[var(--accent)]">.</span>
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--green)]" />
            <span className="hidden sm:inline font-mono text-xs text-[var(--text-3)]">
              Files never stored
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">

        {/* Hero */}
        <section aria-labelledby="lp-hero-heading">
          <div className="max-w-3xl">
            <p className="font-mono text-[11px] text-[var(--accent)] uppercase tracking-widest mb-3">
              Free Online Tool
            </p>
            <h1 id="lp-hero-heading" className="font-mono text-3xl sm:text-4xl lg:text-5xl font-semibold leading-[1.05] tracking-tight text-[var(--text)] mb-4">
              {headline}
            </h1>
            <p className="font-sans text-base text-[var(--text-2)] leading-relaxed mb-3">
              {subheadline}
            </p>
            <p className="font-sans text-sm text-[var(--text-2)] leading-relaxed mb-6">
              {description}
            </p>
            <div className="flex flex-wrap gap-2 mb-8">
              {benefits.map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--text-2)] bg-[var(--surface)] border border-[var(--border)] px-2 py-1"
                >
                  <CheckCircle className="w-3 h-3 text-[var(--green)]" />
                  {b}
                </span>
              ))}
            </div>
            <Link
              href="/"
              className="btn-primary inline-flex items-center gap-2 py-3 px-6 font-mono text-sm font-semibold"
            >
              <Zap className="w-4 h-4" />
              {ctaText}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Trust signals */}
        <section aria-label="Trust signals">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: <Zap className="w-5 h-5 text-[var(--accent)]" />,
                title: "Instant results",
                desc: "Search across hundreds of pages in milliseconds",
              },
              {
                icon: <Lock className="w-5 h-5 text-[var(--green)]" />,
                title: "100% private",
                desc: "Files never leave your browser — ever",
              },
              {
                icon: <ShieldCheck className="w-5 h-5 text-[var(--blue)]" />,
                title: "No signup needed",
                desc: "Free forever, no account required",
              },
            ].map((t) => (
              <div key={t.title} className="card p-5 flex items-start gap-3">
                {t.icon}
                <div>
                  <h3 className="font-mono text-sm font-semibold text-[var(--text)] mb-1">{t.title}</h3>
                  <p className="font-sans text-xs text-[var(--text-2)]">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How-to steps */}
        <section aria-labelledby="lp-howto-heading">
          <h2 id="lp-howto-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-8">
            How it works
          </h2>
          <ol className="space-y-6">
            {howToSteps.map((step, i) => (
              <li key={step.title} className="flex gap-5 items-start">
                <span className="font-mono text-[var(--accent)] text-lg font-bold shrink-0 w-8 mt-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="card p-4 flex-1">
                  <h3 className="font-mono text-sm font-semibold text-[var(--text)] mb-2">{step.title}</h3>
                  <p className="font-sans text-xs text-[var(--text-2)] leading-relaxed">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Link
              href="/"
              className="btn-primary inline-flex items-center gap-2 py-3 px-6 font-mono text-sm font-semibold"
            >
              Try it free — no signup
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="lp-faq-heading">
          <h2 id="lp-faq-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-8">
            Frequently asked questions
          </h2>
          <div className="space-y-3">
            {faqItems.map((faq) => (
              <details key={faq.question} className="card p-4">
                <summary className="font-mono text-sm font-semibold text-[var(--text)] cursor-pointer list-none flex items-start justify-between gap-3">
                  <span>{faq.question}</span>
                  <span className="text-[var(--accent)] shrink-0 mt-0.5 text-base leading-none select-none">+</span>
                </summary>
                <p className="font-sans text-xs text-[var(--text-2)] leading-relaxed mt-3">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section aria-labelledby="lp-cta-heading" className="card p-8 text-center">
          <h2 id="lp-cta-heading" className="font-mono text-2xl font-semibold text-[var(--text)] mb-3">
            Ready to search your PDFs?
          </h2>
          <p className="font-sans text-sm text-[var(--text-2)] mb-6 max-w-md mx-auto">
            Free, instant, and completely private. No signup, no downloads, no limits on how many PDFs you search.
          </p>
          <Link
            href="/"
            className="btn-primary inline-flex items-center gap-2 py-3 px-8 font-mono text-sm font-semibold"
          >
            <Zap className="w-4 h-4" />
            Search PDFs Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between flex-wrap gap-3">
          <Link href="/" className="font-mono text-xs text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors">
            PDFSearch · Free PDF Search Tool
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <Link href="/" className="font-mono text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)]">Home</Link>
            <Link href="/how-to-search-pdf" className="font-mono text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)]">How to Search PDF</Link>
            <Link href="/search-multiple-pdfs" className="font-mono text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)]">Search Multiple PDFs</Link>
            <Link href="/blog" className="font-mono text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)]">Blog</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
