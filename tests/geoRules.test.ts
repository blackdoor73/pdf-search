import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAccess,
  isSearchEngineCrawler,
  isAdminPath,
  normalizeCountryCodes,
  wouldLockOut,
  seoRiskCountries,
  DEFAULT_GEO_RULES,
  type GeoRules,
} from "../src/lib/admin/geoRules.ts";

const siteDenyCN: GeoRules = {
  enabled: true,
  mode: "deny",
  countries: ["CN"],
  scope: "site",
};

const allow = (over: Partial<Parameters<typeof evaluateAccess>[0]> = {}) =>
  evaluateAccess({
    pathname: "/",
    country: "CN",
    userAgent: "Mozilla/5.0 (Macintosh)",
    rules: siteDenyCN,
    ...over,
  });

// ── The SEO guarantee ────────────────────────────────────────────────────────

test("search-engine crawlers are never blocked, from any country", () => {
  for (const ua of [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mozilla/5.0 (compatible; DuckDuckBot-Https/1.1)",
    "Mozilla/5.0 (compatible; YandexBot/3.0)",
    "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 (KHTML, like Gecko) Applebot/0.1",
    "Google-InspectionTool/1.0",
  ]) {
    const d = allow({ userAgent: ua });
    assert.ok(d.allowed, `crawler must pass: ${ua}`);
    assert.equal(d.reason, "search engine crawler");
  }
});

test("crawl-critical paths are never geo-checked", () => {
  for (const p of ["/robots.txt", "/sitemap.xml", "/_next/chunk.js", "/favicon.ico"]) {
    assert.ok(allow({ pathname: p }).allowed, `must be exempt: ${p}`);
  }
});

test("telemetry ingestion is never blocked", () => {
  // If geo blocking silently killed /api/track we would lose the very data
  // that would reveal the misconfiguration.
  assert.ok(allow({ pathname: "/api/track" }).allowed);
});

test("a generic bot user-agent does NOT bypass the block", () => {
  // The analytics bot list matches curl/scrape/python — using it here would
  // let anyone through by setting a header. Only real crawlers are exempt.
  for (const ua of ["curl/8.7.1", "python-requests/2.31", "Scrapy/2.11", "some-bot/1.0"]) {
    assert.equal(allow({ userAgent: ua }).allowed, false, `must be blocked: ${ua}`);
  }
});

// ── Core rule evaluation ─────────────────────────────────────────────────────

test("disabled rules allow everything", () => {
  assert.ok(
    evaluateAccess({
      pathname: "/admin",
      country: "CN",
      userAgent: "Mozilla/5.0",
      rules: DEFAULT_GEO_RULES,
    }).allowed
  );
});

test("an empty country list never blocks the world", () => {
  const d = evaluateAccess({
    pathname: "/",
    country: "CN",
    userAgent: "Mozilla/5.0",
    rules: { enabled: true, mode: "allow", countries: [], scope: "site" },
  });
  assert.ok(d.allowed);
});

test("missing geo data fails open", () => {
  // Local dev and non-Vercel hosts send no country header.
  assert.ok(allow({ country: null }).allowed);
});

test("deny mode blocks only listed countries", () => {
  assert.equal(allow({ country: "CN" }).allowed, false);
  assert.ok(allow({ country: "IN" }).allowed);
  assert.ok(allow({ country: "cn" }).allowed === false, "case-insensitive");
});

test("allow mode blocks everything unlisted", () => {
  const rules: GeoRules = {
    enabled: true,
    mode: "allow",
    countries: ["IN", "US"],
    scope: "site",
  };
  assert.ok(evaluateAccess({ pathname: "/", country: "IN", userAgent: "M", rules }).allowed);
  assert.equal(
    evaluateAccess({ pathname: "/", country: "CN", userAgent: "M", rules }).allowed,
    false
  );
});

test("admin-only scope leaves public pages untouched", () => {
  const rules: GeoRules = { ...siteDenyCN, scope: "admin" };
  assert.ok(evaluateAccess({ pathname: "/", country: "CN", userAgent: "M", rules }).allowed);
  assert.ok(
    evaluateAccess({ pathname: "/blog", country: "CN", userAgent: "M", rules }).allowed
  );
  assert.equal(
    evaluateAccess({ pathname: "/admin", country: "CN", userAgent: "M", rules }).allowed,
    false
  );
  assert.equal(
    evaluateAccess({ pathname: "/api/admin/feedback", country: "CN", userAgent: "M", rules })
      .allowed,
    false
  );
});

test("isAdminPath matches admin routes and not lookalikes", () => {
  assert.ok(isAdminPath("/admin"));
  assert.ok(isAdminPath("/admin/settings"));
  assert.ok(isAdminPath("/api/admin/settings"));
  assert.equal(isAdminPath("/administration"), false);
  assert.equal(isAdminPath("/"), false);
});

// ── Lockout and SEO guards ───────────────────────────────────────────────────

test("wouldLockOut catches blocking your own country", () => {
  assert.ok(wouldLockOut({ ...siteDenyCN, scope: "admin" }, "CN"));
  assert.equal(wouldLockOut({ ...siteDenyCN, scope: "admin" }, "IN"), false);
  assert.equal(wouldLockOut(DEFAULT_GEO_RULES, "CN"), false);
  assert.equal(wouldLockOut(siteDenyCN, null), false);
});

test("wouldLockOut catches an allow-list that omits you", () => {
  const rules: GeoRules = { enabled: true, mode: "allow", countries: ["US"], scope: "admin" };
  assert.ok(wouldLockOut(rules, "IN"));
  assert.equal(wouldLockOut(rules, "US"), false);
});

test("seoRiskCountries flags US only when it affects crawling", () => {
  assert.deepEqual(seoRiskCountries({ ...siteDenyCN, countries: ["US"] }), ["US"]);
  // Admin-only scope cannot affect crawlers at all.
  assert.deepEqual(seoRiskCountries({ ...siteDenyCN, countries: ["US"], scope: "admin" }), []);
  // Allow-list omitting the US is equally risky.
  assert.deepEqual(
    seoRiskCountries({ enabled: true, mode: "allow", countries: ["IN"], scope: "site" }),
    ["US"]
  );
});

test("normalizeCountryCodes cleans and de-duplicates input", () => {
  assert.deepEqual(normalizeCountryCodes(["cn", " RU ", "cn", "bad", "", 42]), ["CN", "RU"]);
  assert.deepEqual(normalizeCountryCodes("CN"), []);
  assert.deepEqual(normalizeCountryCodes(null), []);
});

test("isSearchEngineCrawler ignores empty input", () => {
  assert.equal(isSearchEngineCrawler(""), false);
});
