"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Login failed");
        return;
      }
      const next = params.get("next");
      router.push(next && next.startsWith("/admin") ? next : "/admin");
    } catch {
      setError("Network error — try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card w-full max-w-sm p-8 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-[var(--accent)] flex items-center justify-center">
          <Lock className="w-4 h-4 text-black" />
        </div>
        <div>
          <div className="font-mono text-base font-semibold text-[var(--text)]">
            Admin Access
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">
            pdfsearch.info analytics
          </div>
        </div>
      </div>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Admin password"
        className="input-base"
        autoFocus
        autoComplete="current-password"
        aria-label="Admin password"
      />

      {error && <p className="font-mono text-xs text-[var(--red)]">{error}</p>}

      <button type="submit" disabled={busy || !password} className="btn-primary w-full justify-center">
        {busy ? "Verifying…" : "Sign in"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] grid-bg flex items-center justify-center p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
