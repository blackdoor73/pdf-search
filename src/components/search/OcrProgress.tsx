"use client";

/**
 * Progress for a large OCR run, shown BENEATH the file-level progress bar.
 *
 * The two bars deliberately measure different things: the file bar says
 * "2 / 5 files" and this one says "reading scanned page 12 / 40". Blending them
 * into one number would make both dishonest — a 40-page scan would freeze the
 * file bar at 40% for a minute with no explanation.
 *
 * Only rendered for runs above OCR_SILENT_PAGE_MAX; short runs stay invisible
 * under the normal search spinner.
 */

import type { OcrProgress as OcrProgressType } from "@/types";

interface OcrProgressProps {
  progress: OcrProgressType;
  onCancel?: () => void;
}

export function OcrProgress({ progress, onCancel }: OcrProgressProps) {
  const { fileName, pagesDone, pagesTotal, phase } = progress;
  const pct =
    phase === "warming" || pagesTotal === 0
      ? 0
      : Math.round((pagesDone / pagesTotal) * 100);

  return (
    <div className="space-y-2 animate-slide-in" aria-live="polite">
      <div className="h-0.5 bg-[var(--border)] overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-scan shrink-0" />
          <span
            className="font-mono text-xs text-[var(--text-2)] truncate"
            title={fileName}
          >
            {phase === "warming"
              ? `Preparing to read scanned pages in ${fileName}…`
              : `Reading scanned page ${pagesDone} of ${pagesTotal} — ${fileName}`}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {phase === "reading" && (
            <span className="font-mono text-xs text-[var(--text-3)]">
              {pagesDone} / {pagesTotal}
            </span>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="font-mono text-xs text-[var(--text-3)] underline decoration-dotted underline-offset-4 hover:text-[var(--accent)] transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <p className="font-mono text-[10px] text-[var(--text-3)] leading-relaxed">
        This PDF has no text layer, so its pages are being read with OCR in your
        browser. Nothing is uploaded.
      </p>
    </div>
  );
}

/** Rows shown before collapsing the rest into a "+N more" line. */
const MAX_ROWS = 3;

/**
 * All files currently being read, one row each.
 *
 * Capped so a batch of scanned files cannot push the results section below the
 * fold — the point is reassurance that work is happening, not a full manifest.
 */
export function OcrProgressList({
  items,
  onCancelFile,
  onCancelAll,
}: {
  items: OcrProgressType[];
  onCancelFile?: (fileId: string) => void;
  onCancelAll?: () => void;
}) {
  if (items.length === 0) return null;
  const shown = items.slice(0, MAX_ROWS);
  const hidden = items.length - shown.length;

  return (
    <div className="space-y-3">
      {shown.map((p) => (
        <OcrProgress
          key={p.fileId}
          progress={p}
          onCancel={onCancelFile ? () => onCancelFile(p.fileId) : undefined}
        />
      ))}
      {hidden > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="font-mono text-[10px] text-[var(--text-3)]">
            + {hidden} more file{hidden > 1 ? "s" : ""} being read
          </span>
          {onCancelAll && (
            <button
              type="button"
              onClick={onCancelAll}
              className="font-mono text-[10px] text-[var(--text-3)] underline decoration-dotted underline-offset-4 hover:text-[var(--accent)] transition-colors"
            >
              Cancel all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
