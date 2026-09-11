"use client";

/**
 * Loads the AdSense library — and only when it is genuinely wanted.
 *
 * Gated three ways: the publisher id must be set, the visitor must not have
 * opted out, and the viewport must be wide enough for the rail. A visitor who
 * turned ads off therefore never downloads the ad script at all, rather than
 * downloading it and hiding the result. That is the difference between an
 * honest toggle and a cosmetic one.
 *
 * Mounted in the root layout, but it renders nothing on pages that do not
 * show the rail because the width check fails there too.
 */

import Script from "next/script";
import { useEffect, useState } from "react";
import { AD_RAIL_MIN_WIDTH, readAdPref } from "@/lib/ads/prefs";

const PUBLISHER_ID = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

export function AdScript() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!PUBLISHER_ID) return;
    if (readAdPref() === "off") return;
    if (window.innerWidth < AD_RAIL_MIN_WIDTH) return;
    setEnabled(true);
  }, []);

  if (!PUBLISHER_ID || !enabled) return null;

  return (
    <Script
      id="adsbygoogle-init"
      strategy="afterInteractive"
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`}
    />
  );
}
