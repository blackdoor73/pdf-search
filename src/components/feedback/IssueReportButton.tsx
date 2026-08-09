"use client";

/**
 * Contextual "Report an issue" button + modal.
 *
 * Appears only when a search just disappointed — zero matches, a search error,
 * or a file that errored / couldn't be OCR'd. A permanent second floating
 * button would be clutter; one that shows up exactly when something went wrong
 * is a prompt.
 *
 * The report reuses /api/feedback (category "issue") and attaches search
 * diagnostics: metadata always, a text excerpt ONLY when the visitor ticks the
 * checkbox. The exact payload is shown in a collapsible block before sending —
 * no hidden attachment.
 */

import { useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { MESSAGE_MAX, MESSAGE_MIN } from "@/lib/feedback/schema";
import {
  buildDiagnostics,
  formatDiagnostics,
  type DiagSourceResult,
} from "@/lib/feedback/diagnostics";
import { getIdentity } from "@/lib/analytics/identity";
import { readDeviceCapability } from "@/lib/upload/limits";
import type { PdfFile, SearchOptions, SearchState } from "@/types";

interface IssueReportButtonProps {
  searchState: SearchState;
  searchOptions: SearchOptions;
  files: PdfFile[];
  /** Modal visibility, owned by the page so EmptyState can open it too. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** True when the latest search produced something worth reporting. */
export function hasReportableIssue(searchState: SearchState): boolean {
  if (searchState.status === "error") return true;
  if (searchState.status !== "complete") return false;
  if (searchState.filesWithMatches === 0) return true;
  return searchState.results.some((r) => r.error || r.ocrSkipped);
}

export function IssueReportButton({
  searchState,
  searchOptions,
  files,
  open,
  onOpenChange,
}: IssueReportButtonProps) {
  const pathname = usePathname();
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [includeSample, setIncludeSample] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const openedAt = useRef(0);

  const diagnostics = useMemo(() => {
    const byId = new Map(files.map((f) => [f.id, f]));
    const sources: DiagSourceResult[] = searchState.results.map((r) => {
      const file = byId.get(r.fileId);
      return {
        fileName: r.fileName,
        totalPages: r.totalPages,
        matches: r.matches,
        textLayer: r.textLayer,
        textlessPages: r.textlessPages,
        ocrPages: r.ocrPages,
        ocrConfidence: r.ocrConfidence,
        ocrSkipped: r.ocrSkipped,
        error: r.error,
        sizeBytes: file?.byteSize,
        sha256: file?.contentHash,
        sampleText: r.sampleText,
      };
    });
    const cap = readDeviceCapability();
    return buildDiagnostics({
      query: searchState.query,
      caseSensitive: searchOptions.caseSensitive,
      wholeWord: searchOptions.wholeWord,
      totalMatches: searchState.totalMatches,
      results: sources,
      includeTextSample: includeSample,
      deviceMemory: cap.deviceMemory,
      isMobile: cap.isMobile,
      viewport:
        typeof window !== "undefined"
          ? `${window.innerWidth}x${window.innerHeight}`
          : undefined,
    });
  }, [searchState, searchOptions, files, includeSample]);

  const openModal = () => {
    openedAt.current = Date.now();
    if (!message) {
      setMessage(
        `I searched for "${searchState.query}" and didn't get the results I expected.`
      );
    }
    onOpenChange(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < MESSAGE_MIN) {
      toast.error(`Please write at least ${MESSAGE_MIN} characters.`);
      return;
    }
    setSubmitting(true);
    try {
      const id = getIdentity();
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "issue",
          message: message.trim(),
          email: email.trim() || undefined,
          website: website || undefined,
          page: pathname ?? "/",
          elapsedMs: Date.now() - openedAt.current,
          diagnostics,
          anonId: id.aid,
          sessionId: id.sid,
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok) {
        toast.success("Thanks — the report was sent. We'll dig in.");
        onOpenChange(false);
        setMessage("");
        setEmail("");
        setIncludeSample(false);
      } else {
        toast.error("Couldn't send the report. Please try again.");
      }
    } catch {
      toast.error("Couldn't send the report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-[var(--surface2)] border border-[var(--border)] px-3 py-2 font-mono text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]";

  return (
    <>
      {/* Sits directly above the feedback button (bottom-4), same right edge. */}
      <button
        type="button"
        onClick={openModal}
        aria-label="Report a search issue"
        className="fixed bottom-[4.25rem] right-4 z-[80] flex min-h-11 items-center gap-2 bg-[var(--surface)] text-[var(--text)] border border-[var(--accent)]/40 px-3.5 py-2.5 shadow-lg font-mono text-xs font-semibold hover:border-[var(--accent)] transition-colors"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Bug className="w-4 h-4 text-[var(--accent)]" />
        <span className="hidden sm:inline">Report issue</span>
      </button>

      <Modal
        open={open}
        onClose={() => onOpenChange(false)}
        title="Report a search issue"
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">
              What went wrong?
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
              rows={4}
              required
              placeholder="What did you search for, and what did you expect to find?"
              className={`${inputClass} resize-y`}
            />
            <div className="text-right font-mono text-[10px] text-[var(--text-3)] mt-1">
              {message.length}/{MESSAGE_MAX}
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">
              Email{" "}
              <span className="text-[var(--text-3)] normal-case">
                (optional — only if you want a reply)
              </span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSample}
              onChange={(e) => setIncludeSample(e.target.checked)}
              className="mt-0.5 accent-[var(--accent)]"
            />
            <span className="font-mono text-[11px] text-[var(--text-2)] leading-relaxed">
              Include a short text excerpt (up to 500 characters per file).
              <span className="block text-[var(--text-3)]">
                This is the fastest way for us to spot a garbled text layer —
                but it does send a snippet of the document&apos;s text.
              </span>
            </span>
          </label>

          {/* The exact payload, visible before sending. No hidden attachment. */}
          <details className="border border-[var(--border)]">
            <summary className="cursor-pointer px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] select-none">
              Exactly what will be sent
            </summary>
            <pre className="px-3 pb-3 pt-1 font-mono text-[10px] text-[var(--text-3)] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {formatDiagnostics(diagnostics)}
            </pre>
          </details>

          {/* Honeypot: hidden from users, tempting to bots. */}
          <div className="hidden" aria-hidden>
            <label>
              Website
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-2.5 font-mono text-xs font-semibold disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send report"}
          </button>
          <p className="font-mono text-[10px] text-[var(--text-3)] text-center">
            Your PDF is never uploaded. The report contains search metadata —
            and a text excerpt only if you ticked the box above.
          </p>
        </form>
      </Modal>
    </>
  );
}
