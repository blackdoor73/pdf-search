"use client";

/**
 * Floating feedback button + modal, mounted app-wide (hidden on /admin).
 * Posts to /api/feedback. Anonymous by default; email is optional. Includes
 * a honeypot field and an open-timestamp so the server can drop bots.
 */

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  MESSAGE_MAX,
  MESSAGE_MIN,
  type FeedbackCategory,
} from "@/lib/feedback/schema";

export function FeedbackWidget() {
  const pathname = usePathname();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("general");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const openedAt = useRef(0);

  // Never render on the admin dashboard.
  if (pathname?.startsWith("/admin")) return null;

  const openModal = () => {
    openedAt.current = Date.now();
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < MESSAGE_MIN) {
      toast.error(`Please write at least ${MESSAGE_MIN} characters.`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: message.trim(),
          email: email.trim() || undefined,
          website: website || undefined,
          page: pathname ?? "/",
          elapsedMs: Date.now() - openedAt.current,
        }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (data.ok) {
        toast.success("Thanks — your feedback was sent.");
        setOpen(false);
        setMessage("");
        setEmail("");
        setCategory("general");
      } else {
        toast.error("Couldn't send feedback. Please try again.");
      }
    } catch {
      toast.error("Couldn't send feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-[var(--surface2)] border border-[var(--border)] px-3 py-2 font-mono text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]";

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label="Send feedback"
        className="fixed bottom-4 right-4 z-[80] flex items-center gap-2 bg-[var(--accent)] text-black px-3.5 py-2.5 shadow-lg font-mono text-xs font-semibold hover:opacity-90 transition-opacity"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Send feedback">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
              className={inputClass}
            >
              {FEEDBACK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {FEEDBACK_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
              rows={5}
              required
              placeholder="What's working, what's not, what you'd love to see…"
              className={`${inputClass} resize-y`}
            />
            <div className="text-right font-mono text-[10px] text-[var(--text-3)] mt-1">
              {message.length}/{MESSAGE_MAX}
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">
              Email <span className="text-[var(--text-3)] normal-case">(optional — only if you want a reply)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

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
            {submitting ? "Sending…" : "Send feedback"}
          </button>
          <p className="font-mono text-[10px] text-[var(--text-3)] text-center">
            Anonymous unless you add an email. No files or page content are sent.
          </p>
        </form>
      </Modal>
    </>
  );
}
