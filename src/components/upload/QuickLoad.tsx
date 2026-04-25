"use client";

import { useState } from "react";
import { Zap, ChevronDown, ChevronUp } from "lucide-react";

interface QuickLoadProps {
  onAddUrls: (urls: string[]) => Promise<{ added: number; skipped: string[] }>;
  disabled?: boolean;
}

export function QuickLoad({ onAddUrls, disabled }: QuickLoadProps) {
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(122);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleLoad = async () => {
    if (from > to || from < 1 || to > 122) {
      setFeedback("Invalid range. Must be between 1 and 122.");
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    const urls: string[] = [];
    for (let i = from; i <= to; i++) {
      urls.push(
        `https://www.eci.gov.in/sir/f3/S28/data/OLDSIRROLL/S28/58/S28_58_${i}.pdf`
      );
    }

    setIsLoading(true);
    const { added, skipped } = await onAddUrls(urls);
    setIsLoading(false);
    setFeedback(
      added > 0
        ? `${added} URLs queued${skipped.length > 0 ? `, ${skipped.length} skipped` : ""}`
        : skipped[0] ?? "Nothing added"
    );
    setTimeout(() => setFeedback(null), 3500);
  };

  const count = Math.max(0, to - from + 1);

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)]">
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setExpanded((s) => !s)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface2)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="bg-[var(--accent)] text-black font-mono text-[10px] font-bold px-2 py-0.5 tracking-widest uppercase">
            Quick Load
          </span>
          <span className="font-mono text-xs text-[var(--text-2)]">
            Kashipur 2003 Voter List — ECI Portal
          </span>
          <span className="font-mono text-[10px] text-[var(--text-3)]">
            122 parts available
          </span>
        </div>
        <span className="text-[var(--text-3)]">
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </span>
      </button>

      {/* Expanded controls */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-[var(--border)] space-y-3 animate-slide-in">
          <p className="font-mono text-xs text-[var(--text-3)] leading-relaxed">
            Directly load part PDFs from the Election Commission of India portal.
            URLs are proxied securely — files are never stored.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="font-mono text-xs text-[var(--text-3)]">
                Part
              </label>
              <input
                type="number"
                min={1}
                max={122}
                value={from}
                onChange={(e) =>
                  setFrom(Math.max(1, Math.min(122, parseInt(e.target.value) || 1)))
                }
                disabled={disabled || isLoading}
                className="input-base w-16 text-center py-1.5 text-xs"
              />
              <label className="font-mono text-xs text-[var(--text-3)]">
                to
              </label>
              <input
                type="number"
                min={1}
                max={122}
                value={to}
                onChange={(e) =>
                  setTo(Math.max(1, Math.min(122, parseInt(e.target.value) || 122)))
                }
                disabled={disabled || isLoading}
                className="input-base w-16 text-center py-1.5 text-xs"
              />
              {count > 0 && (
                <span className="font-mono text-[10px] text-[var(--text-3)]">
                  ({count} PDF{count > 1 ? "s" : ""})
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleLoad}
              disabled={disabled || isLoading || from > to}
              className="btn-primary py-1.5"
            >
              {isLoading ? (
                <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Zap className="w-3 h-3" />
              )}
              Load URLs
            </button>
          </div>

          {feedback && (
            <p className="font-mono text-xs text-[var(--text-3)] animate-slide-in">
              {feedback}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
