/**
 * /ads.txt — the IAB authorized-sellers file.
 *
 * Generated rather than a static public/ads.txt because it must carry the
 * publisher id, which lives in an env var. AdSense warns ("Earnings at risk")
 * and some buyers refuse unauthorised inventory when this file is missing.
 *
 * Returns 404 while NEXT_PUBLIC_ADSENSE_CLIENT is unset — an ads.txt
 * containing a placeholder is worse than none, because crawlers cache it.
 */

import { adsTxtLine } from "@/lib/ads/prefs";

export const dynamic = "force-static";
export const revalidate = 86400;

export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) {
    return new Response("Not found", { status: 404 });
  }

  const body = `${adsTxtLine(client)}\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
