"use client";

/**
 * Admin settings — country access rules.
 *
 * Deliberately opinionated about two things: it will not let you block the
 * country you are currently connecting from, and it warns loudly before you
 * do anything that would cost search rankings.
 */

import { useEffect, useState } from "react";
import {
  ConfigNotice,
  ErrorPanel,
  LoadingPanel,
  Panel,
} from "@/components/admin/ui";
import { useAdminData } from "@/components/admin/useAdminData";
import {
  DEFAULT_GEO_RULES,
  normalizeCountryCodes,
  type GeoMode,
  type GeoRules,
  type GeoScope,
} from "@/lib/admin/geoRules";

interface SettingsData {
  configured: boolean;
  rules: GeoRules;
  yourCountry: string | null;
  seoRisk: string[];
  overriddenByEnv: boolean;
  siteWideEnabled: boolean;
}

const inputClass =
  "bg-[var(--surface2)] border border-[var(--border)] px-2 py-1.5 font-mono text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]";

const labelClass =
  "font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]";

export default function AdminSettingsPage() {
  const { data, error, loading } = useAdminData<SettingsData>(
    "/api/admin/settings"
  );

  const [rules, setRules] = useState<GeoRules>(DEFAULT_GEO_RULES);
  const [countryText, setCountryText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null
  );

  // Seed the form once the server state arrives.
  useEffect(() => {
    if (!data?.rules) return;
    setRules(data.rules);
    setCountryText(data.rules.countries.join(", "));
  }, [data?.rules]);

  if (loading) return <LoadingPanel />;
  if (error) return <ErrorPanel message={error} />;
  if (!data?.configured) {
    return <ConfigNotice service="Database" envVars={["DATABASE_URL"]} />;
  }

  const parsedCountries = normalizeCountryCodes(countryText.split(/[,\s]+/));
  const yourCountry = data.yourCountry;
  const blocksYou =
    rules.enabled &&
    parsedCountries.length > 0 &&
    yourCountry !== null &&
    (rules.mode === "deny"
      ? parsedCountries.includes(yourCountry)
      : !parsedCountries.includes(yourCountry));
  const seoRisky =
    rules.enabled &&
    rules.scope === "site" &&
    (rules.mode === "deny"
      ? parsedCountries.includes("US")
      : parsedCountries.length > 0 && !parsedCountries.includes("US"));

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rules, countries: parsedCountries }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage({ kind: "err", text: body.message ?? body.error ?? "Save failed" });
      } else {
        setRules(body.rules);
        setCountryText(body.rules.countries.join(", "));
        setMessage({ kind: "ok", text: "Saved. Changes take effect within a minute." });
      }
    } catch {
      setMessage({ kind: "err", text: "Network error — nothing was saved." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Panel title="Country access">
        <div className="space-y-5">
          <p className="font-sans text-xs text-[var(--text-2)] leading-relaxed">
            Restrict who can reach the site by country. Detected country for
            this request:{" "}
            <span className="font-mono text-[var(--accent)]">
              {yourCountry ?? "unknown (no geo header)"}
            </span>
            .
          </p>

          {data.overriddenByEnv && (
            <p className="font-mono text-[11px] text-[var(--accent)] border border-[var(--accent)] px-3 py-2">
              DISABLE_GEO_RESTRICTIONS=true is set — rules are saved but not
              enforced. Remove it in Vercel to activate them.
            </p>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rules.enabled}
              onChange={(e) => setRules({ ...rules, enabled: e.target.checked })}
            />
            <span className="font-mono text-xs text-[var(--text)]">
              Enable country restrictions
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className={labelClass}>Mode</div>
              <select
                className={`${inputClass} w-full`}
                value={rules.mode}
                onChange={(e) =>
                  setRules({ ...rules, mode: e.target.value as GeoMode })
                }
              >
                <option value="deny">Block the listed countries</option>
                <option value="allow">Allow only the listed countries</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className={labelClass}>Scope</div>
              <select
                className={`${inputClass} w-full`}
                value={rules.scope}
                onChange={(e) =>
                  setRules({ ...rules, scope: e.target.value as GeoScope })
                }
              >
                <option value="admin">Admin dashboard only (no SEO risk)</option>
                <option value="site">Entire site</option>
              </select>
              {rules.scope === "site" && !data.siteWideEnabled && (
                <p className="font-mono text-[10px] text-[var(--accent)]">
                  Needs GEO_SITEWIDE=true in Vercel to take effect. Without it,
                  public pages skip the check so no database read lands on
                  their load time.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className={labelClass}>Countries (ISO codes)</div>
            <input
              className={`${inputClass} w-full`}
              placeholder="CN, RU, KP"
              value={countryText}
              onChange={(e) => setCountryText(e.target.value)}
            />
            <p className="font-mono text-[10px] text-[var(--text-3)]">
              {parsedCountries.length > 0
                ? `Parsed: ${parsedCountries.join(", ")}`
                : "Two-letter codes, comma separated. Empty = no restriction."}
            </p>
          </div>

          {blocksYou && (
            <p className="font-mono text-[11px] text-[#ff6b6b] border border-[#ff6b6b] px-3 py-2">
              These rules would block your own country ({yourCountry}) and lock
              you out. Saving is refused.
            </p>
          )}

          {seoRisky && (
            <p className="font-mono text-[11px] text-[var(--accent)] border border-[var(--accent)] px-3 py-2">
              Warning: this blocks the US site-wide. Googlebot crawls mostly
              from US addresses — real crawlers are still exempted, but this is
              the riskiest setting for search rankings.
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || blocksYou}
              className="bg-[var(--accent)] text-black font-mono text-xs font-semibold px-4 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "SAVING…" : "SAVE"}
            </button>
            {message && (
              <span
                className={`font-mono text-[11px] ${
                  message.kind === "ok" ? "text-[var(--accent)]" : "text-[#ff6b6b]"
                }`}
              >
                {message.text}
              </span>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="How this behaves">
        <ul className="space-y-2 font-sans text-xs text-[var(--text-2)] leading-relaxed list-disc pl-4">
          <li>
            <strong>Search engines are always allowed.</strong> Googlebot,
            Bingbot, DuckDuckBot, Applebot and Yandex are exempted before any
            country check, from any location.
          </li>
          <li>
            <strong>robots.txt, sitemap.xml and static assets are never
            blocked</strong>, so indexing keeps working regardless.
          </li>
          <li>
            With scope set to <strong>admin only</strong>, public pages are not
            evaluated at all — zero effect on visitors or SEO.
          </li>
          <li>
            A VPN bypasses country blocking trivially. Treat this as noise
            reduction, not security — your admin password is the real gate.
          </li>
          <li>
            Locked out anyway? Set{" "}
            <span className="font-mono text-[var(--accent)]">
              DISABLE_GEO_RESTRICTIONS=true
            </span>{" "}
            in Vercel to bypass all rules without a deploy.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
