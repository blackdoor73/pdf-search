/**
 * IndexNow ping helper — tells Bing/Yandex/etc. that specific URLs changed
 * so they re-crawl promptly instead of on their own schedule.
 *
 * The key file lives at public/<INDEXNOW_KEY>.txt (its filename and content
 * are both the key). Invoke MANUALLY after meaningful content changes, e.g.:
 *
 *   node --input-type=module -e "import('./src/lib/seo/indexnow.ts')" ...
 *
 * or from a small script — deliberately NOT wired into the build: pinging
 * on every deploy would spam the endpoint with unchanged URLs.
 */

import { siteUrl, absUrl } from "./site";

export const INDEXNOW_KEY = "7f3a9c14e28b4d6f9a01c5e7b3d82f46";

export async function pingIndexNow(paths: string[]): Promise<boolean> {
  if (paths.length === 0) return true;
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(siteUrl).hostname,
      key: INDEXNOW_KEY,
      keyLocation: `${siteUrl}/${INDEXNOW_KEY}.txt`,
      urlList: paths.map(absUrl),
    }),
  });
  return res.ok;
}
