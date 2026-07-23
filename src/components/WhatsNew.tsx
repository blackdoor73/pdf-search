"use client";

/**
 * "What's New" affordance: a Sparkles button in the header that shows an
 * accent dot when there are changelog entries the user hasn't seen. No
 * auto-popup — the dot only appears for *returning* users (who have the
 * onboarding flag set), so first-time visitors aren't nagged. Clicking
 * opens a Modal with the latest entries and clears the "seen" marker.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { changelog, latestEntryDate } from "@/lib/changelog";

const SEEN_KEY = "pdfsearch:changelog-seen";
const ONBOARDED_KEY = "pdfsearch:onboarded";

export function WhatsNew() {
  const [open, setOpen] = useState(false);
  const [hasUnseen, setHasUnseen] = useState(false);
  const latest = latestEntryDate(changelog);

  useEffect(() => {
    try {
      const returning = localStorage.getItem(ONBOARDED_KEY);
      const seen = localStorage.getItem(SEEN_KEY);
      // Only badge returning users who haven't seen the latest entry.
      if (returning && seen !== latest) setHasUnseen(true);
    } catch {
      // localStorage unavailable — no badge, no harm.
    }
  }, [latest]);

  const openPanel = () => {
    setOpen(true);
    setHasUnseen(false);
    try {
      localStorage.setItem(SEEN_KEY, latest);
    } catch {
      /* ignore */
    }
  };

  const recent = changelog.slice(0, 2);

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        aria-label="What's new"
        className="relative text-[var(--text-3)] hover:text-[var(--accent)] transition-colors p-1"
      >
        <Sparkles className="w-4 h-4" />
        {hasUnseen && (
          <span
            className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
            aria-hidden
          />
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="What's new">
        <div className="space-y-5">
          {recent.map((entry) => (
            <div key={entry.date}>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent)] mb-1.5">
                {new Date(entry.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                · {entry.title}
              </div>
              <ul className="space-y-1 font-sans text-xs text-[var(--text-2)] leading-relaxed list-disc pl-4">
                {entry.items.slice(0, 4).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
          <Link
            href="/changelog"
            onClick={() => setOpen(false)}
            className="inline-block font-mono text-[11px] text-[var(--accent)] hover:underline"
          >
            See the full changelog →
          </Link>
        </div>
      </Modal>
    </>
  );
}
