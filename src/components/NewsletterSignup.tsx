"use client";

/**
 * Compact newsletter signup. Posts to /api/newsletter (Resend audience).
 * Honeypot for bots; inline status message instead of a toast so it works
 * in the footer on server-rendered pages without the ToastProvider.
 */

import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), website: website || undefined }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      setStatus(data.ok ? "done" : "error");
      if (data.ok) setEmail("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <p className="font-mono text-[11px] text-[var(--green)]">
        Thanks — you&apos;re on the list.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 max-w-xs">
      <label className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">
        Product updates
      </label>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 bg-[var(--surface2)] border border-[var(--border)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn-primary px-3 py-1.5 font-mono text-[11px] font-semibold disabled:opacity-60"
        >
          {status === "sending" ? "…" : "Join"}
        </button>
      </div>
      <div className="hidden" aria-hidden>
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      {status === "error" && (
        <p className="font-mono text-[10px] text-[var(--red)]">
          Something went wrong — try again.
        </p>
      )}
      <p className="font-mono text-[10px] text-[var(--text-3)]">
        Occasional updates. No spam, unsubscribe anytime.
      </p>
    </form>
  );
}
