"use client";

import { ShieldCheck } from "lucide-react";

export function PrivacyBadge() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-green-500/5 border border-green-500/15">
      <ShieldCheck className="w-4 h-4 text-[var(--green)] shrink-0 mt-0.5" />
      <div>
        <p className="font-mono text-xs font-medium text-[var(--green)]">
          Your files are never stored
        </p>
        <p className="font-mono text-[11px] text-[var(--text-3)] mt-0.5 leading-relaxed">
          PDFs are processed entirely in your browser or streamed temporarily
          in memory. Nothing is written to any server or database. When you
          close this tab, everything is gone.
        </p>
      </div>
    </div>
  );
}
