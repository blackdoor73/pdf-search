"use client";

import type { OcrSkipped } from "@/types";
import { ocrSkipMessage } from "@/lib/pdf/ocrLimits";

interface EmptyStateProps {
  query: string;
  /**
   * Set when the searched files had no usable text layer.
   *
   * Without this, a scanned PDF got the generic "try a different spelling"
   * advice — which is actively misleading, since no spelling would ever match
   * a document that has no text at all.
   */
  scanned?: {
    fileCount: number;
    /** Present when OCR could not run; absent when OCR ran and still found nothing. */
    ocrSkipped?: OcrSkipped;
    /** A representative filename, for the skip message. */
    fileName?: string;
  };
  /** Opens the issue reporter. When set, a quiet "report this" link is shown. */
  onReport?: () => void;
}

export function EmptyState({ query, scanned, onReport }: EmptyStateProps) {
  const isScanned = Boolean(scanned && scanned.fileCount > 0);

  return (
    <div className="text-center py-16 animate-slide-in">
      <div className="font-mono text-5xl mb-4 opacity-30">
        {isScanned ? "⌨" : "∅"}
      </div>
      <p className="font-mono text-sm font-medium text-[var(--text-2)] mb-2">
        No matches for &ldquo;{query}&rdquo;
      </p>

      {isScanned && scanned ? (
        <p className="font-mono text-xs text-[var(--text-3)] max-w-md mx-auto leading-relaxed">
          {scannedMessage(scanned)}
        </p>
      ) : (
        <p className="font-mono text-xs text-[var(--text-3)] max-w-sm mx-auto leading-relaxed">
          Try a different spelling, fewer words, or disable{" "}
          <span className="text-[var(--text-2)]">Whole word</span> and{" "}
          <span className="text-[var(--text-2)]">Case sensitive</span> options.
        </p>
      )}

      {onReport && (
        <button
          type="button"
          onClick={onReport}
          className="mt-5 font-mono text-xs text-[var(--text-3)] underline decoration-dotted underline-offset-4 hover:text-[var(--accent)] transition-colors"
        >
          Not what you expected? Report this
        </button>
      )}
    </div>
  );
}

/**
 * The honest explanation for a scanned PDF that produced no matches.
 *
 * "cancelled" and "failed" are outcomes of an OCR run rather than reasons it
 * never started, so they get their own copy — telling someone their browser is
 * unsupported when OCR actually crashed mid-run would just be wrong.
 */
function scannedMessage(scanned: NonNullable<EmptyStateProps["scanned"]>): string {
  const subject =
    scanned.fileCount === 1 && scanned.fileName
      ? scanned.fileName
      : `${scanned.fileCount} of your PDFs`;

  switch (scanned.ocrSkipped) {
    case "mobile":
    case "low-memory":
    case "unsupported":
    case "budget":
      return ocrSkipMessage(scanned.ocrSkipped, subject);
    case "cancelled":
      return `Reading the scanned pages in ${subject} was cancelled, so they weren't searched. Run the search again to read them.`;
    case "failed":
      return `${subject} is a scanned image, and reading it didn't finish. Some pages may not have been searched.`;
    default:
      // OCR ran and succeeded — the word genuinely wasn't recognized.
      return `This PDF is a scanned image, so its text was read with OCR. Recognition isn't perfect — try a shorter or more distinctive part of the word.`;
  }
}
