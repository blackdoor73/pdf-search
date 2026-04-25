"use client";

interface EmptyStateProps {
  query: string;
}

export function EmptyState({ query }: EmptyStateProps) {
  return (
    <div className="text-center py-16 animate-slide-in">
      <div className="font-mono text-5xl mb-4 opacity-30">∅</div>
      <p className="font-mono text-sm font-medium text-[var(--text-2)] mb-2">
        No matches for &ldquo;{query}&rdquo;
      </p>
      <p className="font-mono text-xs text-[var(--text-3)] max-w-sm mx-auto leading-relaxed">
        Try a different spelling, fewer words, or disable{" "}
        <span className="text-[var(--text-2)]">Whole word</span> and{" "}
        <span className="text-[var(--text-2)]">Case sensitive</span> options.
      </p>
    </div>
  );
}
