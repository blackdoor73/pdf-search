"use client";

import { CheckCircle2, XCircle, FileSearch, Clock } from "lucide-react";
import type { SearchState } from "@/types";

interface ResultsSummaryProps {
  searchState: SearchState;
}

export function ResultsSummary({ searchState }: ResultsSummaryProps) {
  const {
    query,
    totalMatches,
    filesWithMatches,
    filesSearched,
    startedAt,
    completedAt,
  } = searchState;

  const duration =
    startedAt && completedAt
      ? ((completedAt - startedAt) / 1000).toFixed(2)
      : null;

  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-[var(--border)] flex-wrap">
      {/* Left: match summary */}
      <div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-mono text-3xl font-semibold text-[var(--accent)]">
            {totalMatches.toLocaleString()}
          </span>
          <span className="font-mono text-sm text-[var(--text-2)]">
            match{totalMatches !== 1 ? "es" : ""} for{" "}
            <span className="text-[var(--text)] font-medium">&ldquo;{query}&rdquo;</span>
          </span>
        </div>
        {duration && (
          <p className="font-mono text-[10px] text-[var(--text-3)] mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Searched {filesSearched} PDF{filesSearched !== 1 ? "s" : ""} in{" "}
            {duration}s
          </p>
        )}
      </div>

      {/* Right: pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="w-3 h-3 text-[var(--green)]" />
          <span className="font-mono text-xs text-[var(--green)]">
            {filesWithMatches} found
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--border)]/50 border border-[var(--border)]">
          <XCircle className="w-3 h-3 text-[var(--text-3)]" />
          <span className="font-mono text-xs text-[var(--text-3)]">
            {filesSearched - filesWithMatches} no match
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--border)]/50 border border-[var(--border)]">
          <FileSearch className="w-3 h-3 text-[var(--text-3)]" />
          <span className="font-mono text-xs text-[var(--text-3)]">
            {filesSearched} total
          </span>
        </div>
      </div>
    </div>
  );
}
