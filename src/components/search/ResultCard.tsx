"use client";

import { useState } from "react";
import { FileText, Link, ChevronDown, ChevronUp, ExternalLink, Copy, Check } from "lucide-react";
import clsx from "clsx";
import type { SearchResult } from "@/types";

interface ResultCardProps {
  result: SearchResult & { error?: string };
  query: string;
  index: number;
}

export function ResultCard({ result, query: _query, index }: ResultCardProps) {
  const [open, setOpen] = useState(index < 3); // First 3 auto-expanded
  const [copied, setCopied] = useState(false);

  const hasMatches = result.matches.length > 0;
  const hasError = "error" in result && result.error;

  const copyUrl = async () => {
    if (result.sourceUrl) {
      await navigator.clipboard.writeText(result.sourceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={clsx(
        "card overflow-hidden animate-slide-in transition-all",
        !hasMatches && "opacity-60"
      )}
      style={{ animationDelay: `${Math.min(index * 0.04, 0.5)}s` }}
    >
      {/* Card header */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-[var(--surface2)] border-b border-[var(--border)] cursor-pointer hover:bg-[var(--surface2)]/80 transition-colors"
        onClick={() => hasMatches && setOpen((s) => !s)}
      >
        {/* Icon */}
        <div
          className={clsx(
            "w-8 h-8 flex items-center justify-center border shrink-0",
            hasMatches
              ? "border-[var(--accent)]/30 bg-yellow-500/5"
              : "border-[var(--border)] bg-[var(--surface)]"
          )}
        >
          {result.sourceType === "url" ? (
            <Link
              className={clsx(
                "w-3.5 h-3.5",
                hasMatches ? "text-[var(--accent)]" : "text-[var(--text-3)]"
              )}
            />
          ) : (
            <FileText
              className={clsx(
                "w-3.5 h-3.5",
                hasMatches ? "text-[var(--accent)]" : "text-[var(--text-3)]"
              )}
            />
          )}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-medium text-[var(--text)] truncate">
            {result.fileName}
          </p>
          <p className="font-mono text-[10px] text-[var(--text-3)] mt-0.5">
            {result.totalPages > 0 && `${result.totalPages} pages · `}
            {result.searchDurationMs}ms
            {result.sourceUrl && (
              <span className="ml-2 text-[var(--blue)]/70 truncate max-w-[200px] inline-block align-bottom">
                {result.sourceUrl}
              </span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {result.sourceUrl && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  copyUrl();
                }}
                className="text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors"
                title="Copy URL"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-[var(--green)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <a
                href={result.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[var(--text-3)] hover:text-[var(--blue)] transition-colors"
                title="Open original"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </>
          )}

          {/* Match badge */}
          {hasMatches ? (
            <span className="bg-[var(--accent)] text-black font-mono text-[10px] font-bold px-2.5 py-1">
              {result.matches.length} match{result.matches.length > 1 ? "es" : ""}
            </span>
          ) : hasError ? (
            <span className="bg-red-500/20 text-[var(--red)] font-mono text-[10px] px-2.5 py-1 border border-red-500/20">
              Error
            </span>
          ) : (
            <span className="bg-[var(--border)] text-[var(--text-3)] font-mono text-[10px] px-2.5 py-1">
              No matches
            </span>
          )}

          {/* Chevron */}
          {hasMatches && (
            <span className="text-[var(--text-3)] ml-1">
              {open ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </div>
      </div>

      {/* Error state */}
      {hasError && (
        <div className="px-4 py-3 font-mono text-xs text-[var(--red)] bg-red-500/5">
          ⚠ {(result as SearchResult & { error: string }).error}
        </div>
      )}

      {/* Match list */}
      {hasMatches && open && (
        <div className="divide-y divide-[var(--border)]">
          {result.matches.map((match, i) => (
            <div
              key={i}
              className="flex gap-4 px-4 py-3 hover:bg-[var(--surface2)]/50 transition-colors"
            >
              {/* Page indicator */}
              <div className="shrink-0 pt-0.5">
                <span className="font-mono text-[10px] text-[var(--text-3)] bg-[var(--surface2)] px-1.5 py-0.5 border border-[var(--border)]">
                  p.{match.page}
                </span>
              </div>

              {/* Match text with highlights */}
              <p
                className="font-mono text-xs text-[var(--text-2)] leading-relaxed break-words min-w-0 flex-1"
                dangerouslySetInnerHTML={{ __html: match.highlightedHtml }}
              />
            </div>
          ))}

          {/* Page summary */}
          {result.matchedPages.length > 1 && (
            <div className="px-4 py-2 bg-[var(--surface2)]">
              <span className="font-mono text-[10px] text-[var(--text-3)]">
                Matches on pages:{" "}
                {result.matchedPages.slice(0, 20).join(", ")}
                {result.matchedPages.length > 20 &&
                  ` +${result.matchedPages.length - 20} more`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
