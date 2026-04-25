"use client";

import type { SearchProgress as SearchProgressType } from "@/types";

interface SearchProgressProps {
  progress: SearchProgressType;
  filesTotal: number;
}

export function SearchProgress({ progress, filesTotal }: SearchProgressProps) {
  const { completed, currentFile, percentage } = progress;

  return (
    <div className="space-y-2 animate-slide-in">
      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--border)] overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {/* Scanning dot */}
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-scan shrink-0" />
          <span
            className="font-mono text-xs text-[var(--text-2)] truncate"
            title={currentFile}
          >
            {currentFile ? `Scanning: ${currentFile}` : "Initializing…"}
          </span>
        </div>
        <span className="font-mono text-xs text-[var(--text-3)] shrink-0 ml-4">
          {completed} / {filesTotal}
        </span>
      </div>
    </div>
  );
}
