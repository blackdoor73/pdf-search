/**
 * Ad preference: on by default, off when the visitor says so.
 *
 * Pure and dependency-free so it is unit-testable under `node --test` — the
 * same shape as lib/pdf/ocrLimits.ts. Nothing here touches the DOM; the
 * storage read/write wrappers are the only impure functions and they swallow
 * their own errors (Safari private mode throws on localStorage access).
 *
 * The preference is honour-system by design. There is no membership check, so
 * a non-supporter can switch ads off. At this traffic that costs almost
 * nothing, and it avoids both an OAuth flow and the "I supported but still see
 * ads" support burden that comes with one.
 */

export const AD_PREF_KEY = "pdfsearch:ads";

export type AdPref = "on" | "off";

export const DEFAULT_AD_PREF: AdPref = "on";

/**
 * Minimum viewport width for the side rail.
 *
 * The content column is max-w-5xl (1024px) centred. A 160px unit plus
 * breathing room needs ~1280px before the margin can hold it without
 * crowding the tool. Below this the rail is not rendered at all — it is
 * never squeezed, stacked into the content, or shown on mobile.
 */
export const AD_RAIL_MIN_WIDTH = 1280;

/** Standard IAB wide skyscraper. Reserved even when unfilled — see AdRail. */
export const AD_RAIL_WIDTH = 160;
export const AD_RAIL_HEIGHT = 600;

export function parseAdPref(raw: string | null | undefined): AdPref {
  return raw === "off" ? "off" : DEFAULT_AD_PREF;
}

/**
 * Whether to render the rail at all.
 *
 * Every condition must hold: a publisher id must be configured (otherwise
 * there is nothing to fill the slot), the visitor must not have opted out,
 * and the viewport must be wide enough. Separated from the component so the
 * rules are testable without a DOM.
 */
export function shouldShowRail(opts: {
  pref: AdPref;
  viewportWidth: number;
  publisherId?: string | null;
}): boolean {
  if (!opts.publisherId) return false;
  if (opts.pref === "off") return false;
  return opts.viewportWidth >= AD_RAIL_MIN_WIDTH;
}

export function readAdPref(): AdPref {
  if (typeof window === "undefined") return DEFAULT_AD_PREF;
  try {
    return parseAdPref(window.localStorage.getItem(AD_PREF_KEY));
  } catch {
    return DEFAULT_AD_PREF;
  }
}

export function writeAdPref(pref: AdPref): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AD_PREF_KEY, pref);
  } catch {
    /* private mode — the preference simply does not persist */
  }
}

/**
 * Normalises an AdSense publisher id for ads.txt.
 *
 * AdSense displays the id as "ca-pub-…" but ads.txt requires "pub-…". Emitting
 * the raw value produced "pub-ca-pub-…", an invalid line that silently voids
 * the file — and an invalid ads.txt is worse than none, because buyers treat
 * the inventory as unauthorised.
 */
export function normalizePublisherId(client: string): string {
  return client.trim().replace(/^ca-/i, "").replace(/^pub-/i, "");
}

export function adsTxtLine(client: string): string {
  return `google.com, pub-${normalizePublisherId(client)}, DIRECT, f08c47fec0942fa0`;
}
