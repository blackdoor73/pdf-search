"use client";

import { useState } from "react";
import { Zap, ChevronDown, ChevronUp } from "lucide-react";

interface QuickLoadProps {
  onAddUrls: (urls: string[]) => Promise<{ added: number; skipped: string[] }>;
  disabled?: boolean;
}

const MAX_RANGE_SIZE = 200;

export function QuickLoad({ onAddUrls, disabled }: QuickLoadProps) {
  const [pattern, setPattern] = useState("");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const trimmedPattern = pattern.trim();
  const hasHttps = trimmedPattern.startsWith("https://");
  const hasPlaceholder = trimmedPattern.includes("{i}");
  const isPatternValid = hasHttps && hasPlaceholder;
  const count = Math.max(0, to - from + 1);
  const isRangeValid = from >= 1 && to >= from && count <= MAX_RANGE_SIZE;
  const canSubmit = isPatternValid && isRangeValid && !disabled && !isLoading;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleLoad = async () => {
    if (!hasHttps) {
      showFeedback("URL pattern must start with https://");
      return;
    }
    if (!hasPlaceholder) {
      showFeedback("URL pattern must include the {i} placeholder");
      return;
    }
    if (!isRangeValid) {
      showFeedback(
        count > MAX_RANGE_SIZE
          ? `Range too large (max ${MAX_RANGE_SIZE} URLs at once)`
          : "Invalid range"
      );
      return;
    }

    const urls: string[] = [];
    for (let i = from; i <= to; i++) {
      urls.push(trimmedPattern.replace(/\{i\}/g, String(i)));
    }

    setIsLoading(true);
    const { added, skipped } = await onAddUrls(urls);
    setIsLoading(false);
    showFeedback(
      added > 0
        ? `${added} URL${added > 1 ? "s" : ""} queued${
            skipped.length > 0 ? `, ${skipped.length} skipped` : ""
          }`
        : skipped[0] ?? "Nothing added"
    );
  };

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
            Bulk URL pattern loader
          </span>
          <span className="font-mono text-[10px] text-[var(--text-3)] hidden sm:inline">
            use {"{i}"} as the index placeholder
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
            Queue a numbered series of PDFs from a URL pattern. Use{" "}
            <code className="text-[var(--text-2)]">{"{i}"}</code> where the
            number should appear (e.g.{" "}
            <code className="text-[var(--text-2)]">
              https://example.com/report_{"{i}"}.pdf
            </code>
            ). URLs are fetched through the secure proxy — files are never
            stored.
          </p>

          <div>
            <label className="font-mono text-[10px] text-[var(--text-3)] uppercase tracking-widest block mb-1">
              URL pattern
            </label>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="https://example.com/files/part_{i}.pdf"
              disabled={disabled || isLoading}
              spellCheck={false}
              className="input-base w-full text-xs py-1.5"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="font-mono text-xs text-[var(--text-3)]">
                From
              </label>
              <input
                type="number"
                min={1}
                value={from}
                onChange={(e) =>
                  setFrom(Math.max(1, parseInt(e.target.value) || 1))
                }
                disabled={disabled || isLoading}
                className="input-base w-20 text-center py-1.5 text-xs"
              />
              <label className="font-mono text-xs text-[var(--text-3)]">
                to
              </label>
              <input
                type="number"
                min={from}
                value={to}
                onChange={(e) =>
                  setTo(Math.max(1, parseInt(e.target.value) || 1))
                }
                disabled={disabled || isLoading}
                className="input-base w-20 text-center py-1.5 text-xs"
              />
              {count > 0 && (
                <span className="font-mono text-[10px] text-[var(--text-3)]">
                  ({count} URL{count > 1 ? "s" : ""})
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleLoad}
              disabled={!canSubmit}
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
