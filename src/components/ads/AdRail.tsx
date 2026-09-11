"use client";

/**
 * Right-margin ad rail.
 *
 * Renders nothing at all unless NEXT_PUBLIC_ADSENSE_CLIENT is set, so this
 * component is inert until an ad network is actually approved. It is safe to
 * ship before then.
 *
 * Three deliberate constraints:
 *
 * 1. RESERVED SPACE. The container is a fixed 160x600 whether or not an ad
 *    fills it. The single loudest complaint about the reference site's ads
 *    (monkeytype issue #928) is that the content moves as ads load. On a
 *    results list that would be worse than on a typing test.
 *
 * 2. DESKTOP ONLY. Mounted only above AD_RAIL_MIN_WIDTH, measured live so a
 *    window resize takes effect. Never squeezed into the content column and
 *    never rendered on mobile.
 *
 * 3. OUTSIDE THE FLOW. Absolutely positioned against a full-width wrapper so
 *    it occupies the empty margin beside the max-w-5xl column without
 *    narrowing it. z-40 sits under the sticky header (z-50) and well under
 *    the FABs (z-80) and toasts (z-100).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics/client";
import {
  AD_RAIL_HEIGHT,
  AD_RAIL_MIN_WIDTH,
  AD_RAIL_WIDTH,
  readAdPref,
  shouldShowRail,
  writeAdPref,
  type AdPref,
} from "@/lib/ads/prefs";

/**
 * Width is measured with matchMedia, NOT window.innerWidth.
 *
 * innerWidth includes the scrollbar; a CSS media query does not. Around the
 * threshold the two disagree by ~15px, so a JS check against innerWidth could
 * mount the rail while the `xl:` breakpoint kept its wrapper hidden — a
 * reserved 160x600 slot that receives an ad push but is never visible, which
 * is an AdSense policy problem, not just a cosmetic one.
 */
const RAIL_MEDIA_QUERY = `(min-width: ${AD_RAIL_MIN_WIDTH}px)`;

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const SLOT_ID = process.env.NEXT_PUBLIC_ADSENSE_RAIL_SLOT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdRail() {
  // Start hidden and decide after mount: the preference lives in
  // localStorage and the width is a client measurement, so rendering the
  // rail during SSR would guarantee a hydration mismatch.
  const [pref, setPref] = useState<AdPref>("off");
  const [wideEnough, setWideEnough] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pushed = useRef(false);

  useEffect(() => {
    setPref(readAdPref());
    setMounted(true);

    const mq = window.matchMedia(RAIL_MEDIA_QUERY);
    const sync = () => setWideEnough(mq.matches);
    sync();

    // Both listeners on purpose. `change` is the correct event and fires in
    // real browsers; a plain `resize` fallback covers environments where the
    // viewport is altered programmatically without a media-query transition
    // being dispatched (device emulators do this). Re-reading mq.matches in
    // both paths keeps the two in agreement, so the extra listener cannot
    // disagree with the CSS breakpoint.
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  // shouldShowRail still owns the publisher-id and preference rules; the
  // width argument is derived from the same query the CSS uses.
  const visible =
    mounted &&
    shouldShowRail({
      pref,
      viewportWidth: wideEnough ? AD_RAIL_MIN_WIDTH : 0,
      publisherId: PUBLISHER_ID,
    });

  // Hand the slot to AdSense exactly once. Pushing twice for one <ins> is a
  // policy violation and throws "adsbygoogle.push() error: All ins elements
  // ... already have ads in them".
  useEffect(() => {
    if (!visible || pushed.current || !SLOT_ID) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* blocked or not yet loaded — the reserved box simply stays empty */
    }
  }, [visible]);

  const turnOff = useCallback(() => {
    writeAdPref("off");
    setPref("off");
    track("ad_pref_changed", { pref: "off" });
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden={false}
      className="pointer-events-none absolute inset-0 hidden xl:block"
    >
      <aside
        aria-label="Advertisement"
        className="pointer-events-auto sticky top-20 ml-auto mr-4 2xl:mr-10"
        style={{ width: AD_RAIL_WIDTH }}
      >
        <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">
          Advertisement
        </p>

        {/* Fixed box: holds its size whether or not the ad fills. */}
        <div
          className="card overflow-hidden"
          style={{ width: AD_RAIL_WIDTH, height: AD_RAIL_HEIGHT }}
        >
          {SLOT_ID && (
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: AD_RAIL_WIDTH, height: AD_RAIL_HEIGHT }}
              data-ad-client={PUBLISHER_ID}
              data-ad-slot={SLOT_ID}
            />
          )}
        </div>

        <div className="mt-2 space-y-1.5">
          <p className="font-sans text-[11px] leading-relaxed text-[var(--text-3)]">
            One ad keeps PDFSearch free, fast, and private. Built by one developer.
          </p>
          <a
            href="/support"
            className="block font-mono text-[10px] text-[var(--accent)] hover:underline"
          >
            Support the project →
          </a>
          <button
            type="button"
            onClick={turnOff}
            className="font-mono text-[10px] text-[var(--text-3)] hover:text-[var(--text-2)] underline underline-offset-2 transition-colors"
          >
            Turn off ads
          </button>
        </div>
      </aside>
    </div>
  );
}

/** Exported for the settings surface on /support. */
export { AD_RAIL_MIN_WIDTH };
