/**
 * Bot / crawler detection for telemetry ingestion.
 *
 * Googlebot and most link-preview + monitoring bots execute JavaScript, so
 * they run the tracker, mint fresh anonymous ids (empty cookie jar every
 * render), and register as new "users". This was the largest source of
 * inflated visitor counts. Shared by the ingest route and unit tests.
 */

const BOT_UA_RE = new RegExp(
  [
    "bot",
    "crawl",
    "spider",
    "slurp",
    "headless",
    "phantom",
    "puppeteer",
    "playwright",
    "selenium",
    "lighthouse",
    "pagespeed",
    "pingdom",
    "uptime",
    "monitor",
    "scanner",
    "scrape",
    "curl",
    "wget",
    "python-requests",
    "python-urllib",
    "aiohttp",
    "axios",
    "node-fetch",
    "go-http-client",
    "okhttp",
    "java/",
    "libwww",
    "facebookexternalhit",
    "whatsapp",
    "telegrambot",
    "discordbot",
    "slackbot",
    "twitterbot",
    "linkedinbot",
    "pinterestbot",
    "bingpreview",
    "yandex",
    "baiduspider",
    "duckduckgo",
    "applebot",
    "amazonbot",
    "bytespider",
    "petalbot",
    "semrush",
    "ahrefs",
    "mj12",
    "dotbot",
    "gptbot",
    "claudebot",
    "anthropic-ai",
    "perplexitybot",
    "ccbot",
    "vercel-screenshot",
    "prerender",
  ].join("|"),
  "i"
);

/** True when the UA is a known bot — or absent, which no real browser is. */
export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || ua.trim() === "") return true;
  return BOT_UA_RE.test(ua);
}
