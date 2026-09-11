"use client";

/**
 * Interactive vote board. Server-rendered features come in as props so the
 * list is in the HTML for crawlers; only the vote state is client-side.
 *
 * Votes are optimistic: the count moves immediately and is reconciled with
 * the server's authoritative count on response. A failed vote rolls back.
 */

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { getIdentity } from "@/lib/analytics/identity";
import { track } from "@/lib/analytics/client";
import { useToast } from "@/components/ui/Toast";
import {
  FEATURE_STATUSES,
  FEATURE_STATUS_LABELS,
  type FeatureRequest,
  type FeatureStatus,
} from "@/lib/roadmap/types";

const STATUS_STYLE: Record<FeatureStatus, string> = {
  considering: "text-[var(--text-3)] border-[var(--border2)]",
  planned: "text-[var(--blue)] border-[var(--blue)]",
  building: "text-[var(--accent)] border-[var(--accent)]",
  shipped: "text-[var(--green)] border-[var(--green)]",
};

export function VoteBoard({ features }: { features: FeatureRequest[] }) {
  const toast = useToast();
  const [counts, setCounts] = useState<Record<number, number>>(() =>
    Object.fromEntries(features.map((f) => [f.id, f.votes]))
  );
  const [voted, setVoted] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<Set<number>>(new Set());

  // Which features this visitor already voted for. Client-side because the
  // anon id lives in the browser; the board renders fully without it.
  useEffect(() => {
    let cancelled = false;
    try {
      const { aid } = getIdentity();
      fetch(`/api/roadmap/vote?anonId=${encodeURIComponent(aid)}`)
        .then((r) => r.json())
        .then((d: { voted?: number[] }) => {
          if (!cancelled && Array.isArray(d.voted)) setVoted(new Set(d.voted));
        })
        .catch(() => {
          /* board stays usable without prior-vote state */
        });
    } catch {
      /* storage unavailable — voting still works, just unmarked */
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const vote = async (f: FeatureRequest) => {
    if (voted.has(f.id) || pending.has(f.id)) return;

    let aid: string;
    try {
      aid = getIdentity().aid;
    } catch {
      toast.error("Voting needs site storage enabled in your browser.");
      return;
    }

    setPending((p) => new Set(p).add(f.id));
    setCounts((c) => ({ ...c, [f.id]: (c[f.id] ?? 0) + 1 }));
    setVoted((v) => new Set(v).add(f.id));

    try {
      const res = await fetch("/api/roadmap/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: f.slug, anonId: aid }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        votes?: number | null;
      };
      if (!res.ok || !data.ok) throw new Error("vote rejected");
      if (typeof data.votes === "number") {
        setCounts((c) => ({ ...c, [f.id]: data.votes as number }));
      }
      track("roadmap_vote", { slug: f.slug });
    } catch {
      setCounts((c) => ({ ...c, [f.id]: Math.max(0, (c[f.id] ?? 1) - 1) }));
      setVoted((v) => {
        const next = new Set(v);
        next.delete(f.id);
        return next;
      });
      toast.error("Couldn't record your vote. Please try again.");
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(f.id);
        return next;
      });
    }
  };

  const groups = FEATURE_STATUSES.map((status) => ({
    status,
    items: features.filter((f) => f.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.status}>
          <h2 className="section-label">{FEATURE_STATUS_LABELS[group.status]}</h2>
          <ul className="space-y-2">
            {group.items.map((f) => {
              const hasVoted = voted.has(f.id);
              const isShipped = f.status === "shipped";
              return (
                <li key={f.id} className="card p-4 flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => vote(f)}
                    disabled={hasVoted || pending.has(f.id) || isShipped}
                    aria-pressed={hasVoted}
                    aria-label={
                      isShipped
                        ? `${f.title} — shipped, ${counts[f.id] ?? 0} votes`
                        : hasVoted
                          ? `You voted for ${f.title}`
                          : `Vote for ${f.title}`
                    }
                    className={`shrink-0 w-12 min-h-11 flex flex-col items-center justify-center border transition-colors ${
                      hasVoted
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : isShipped
                          ? "border-[var(--border)] text-[var(--text-3)] cursor-default"
                          : "border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer"
                    } disabled:cursor-default`}
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span className="font-mono text-xs font-semibold tabular-nums">
                      {counts[f.id] ?? 0}
                    </span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-mono text-sm font-semibold text-[var(--text)]">
                        {f.title}
                      </h3>
                      <span
                        className={`font-mono text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${STATUS_STYLE[f.status]}`}
                      >
                        {FEATURE_STATUS_LABELS[f.status]}
                      </span>
                    </div>
                    {f.description && (
                      <p className="font-sans text-sm text-[var(--text-2)] leading-relaxed">
                        {f.description}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
