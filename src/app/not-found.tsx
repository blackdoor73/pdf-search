import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg)] grid-bg flex items-center justify-center">
      <div className="text-center space-y-4 px-6">
        <p className="font-mono text-7xl font-semibold text-[var(--border2)]">404</p>
        <h1 className="font-mono text-xl font-medium text-[var(--text)]">
          Page not found
        </h1>
        <p className="font-mono text-sm text-[var(--text-3)] max-w-xs mx-auto">
          This page doesn&apos;t exist. Head back to search your PDFs.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 btn-primary mt-2"
        >
          ← Back to PDFSearch
        </Link>
      </div>
    </div>
  );
}
