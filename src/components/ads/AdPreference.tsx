"use client";

/**
 * Ad preference control for /support.
 *
 * This is the ONLY way back once someone has turned ads off from the rail,
 * so it must render even when ads are not configured — otherwise a visitor
 * who opted out has no route to change their mind.
 */

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics/client";
import { readAdPref, writeAdPref, type AdPref } from "@/lib/ads/prefs";

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export function AdPreference() {
  const [pref, setPref] = useState<AdPref | null>(null);

  // null until mounted: the value lives in localStorage, so rendering a
  // guess on the server would flash the wrong state.
  useEffect(() => setPref(readAdPref()), []);

  const choose = (next: AdPref) => {
    writeAdPref(next);
    setPref(next);
    track("ad_pref_changed", { pref: next });
  };

  if (pref === null) {
    return <div className="card p-4" style={{ minHeight: 96 }} aria-hidden />;
  }

  return (
    <div className="card p-4">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-2">
        Ad preference
      </p>

      {!PUBLISHER_ID && (
        <p className="font-sans text-sm text-[var(--text-2)] leading-relaxed mb-3">
          There are no ads running on this site at the moment. You can still set your
          preference here and it will be respected if that ever changes.
        </p>
      )}

      <div className="flex items-center gap-2 mb-3">
        {(["on", "off"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => choose(opt)}
            aria-pressed={pref === opt}
            className={`font-mono text-[11px] uppercase tracking-wider px-3 py-2 border transition-colors ${
              pref === opt
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)] hover:border-[var(--border2)]"
            }`}
          >
            {opt === "on" ? "Show ads" : "No ads"}
          </button>
        ))}
      </div>

      <p className="font-sans text-xs text-[var(--text-3)] leading-relaxed">
        {pref === "on"
          ? "Thank you — a single ad in the right margin on wide screens helps cover the running costs. It never appears on mobile or inside your search results."
          : "Ads are off. The ad script is not downloaded at all, so nothing is loaded on your behalf."}{" "}
        This setting is stored in your browser, on your word alone — there is no check.
      </p>
    </div>
  );
}
