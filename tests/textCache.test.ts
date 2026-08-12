import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createPageTextCache,
  cacheKeyFor,
  estimateDocBytes,
  TEXT_CACHE_MAX_BYTES,
  type CachedPage,
  type CachedDoc,
} from "../src/lib/pdf/textCache.ts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePage(pageNum: number, text = "hello world"): CachedPage {
  return { pageNum, lines: [text], textChars: text.length };
}

function makeDoc(
  pages: CachedPage[] = [makePage(1)],
  overrides: Partial<CachedDoc> = {}
): CachedDoc {
  return {
    pages,
    verdict: "text",
    textlessPages: [],
    ocrPages: [],
    complete: true,
    bytes: estimateDocBytes(pages),
    storedAt: Date.now(),
    ...overrides,
  };
}

// ─── cacheKeyFor ─────────────────────────────────────────────────────────────

test("cacheKeyFor prefers content hash when present", () => {
  const key = cacheKeyFor({ id: "abc", contentHash: "sha256hex" });
  assert.equal(key, "content:sha256hex");
});

test("cacheKeyFor falls back to id: when contentHash is undefined", () => {
  const key = cacheKeyFor({ id: "abc" });
  assert.equal(key, "id:abc");
});

test("cacheKeyFor falls back to id: when contentHash is empty string", () => {
  const key = cacheKeyFor({ id: "abc", contentHash: "" });
  assert.equal(key, "id:abc");
});

test("two files with same name+size but different hashes produce different keys", () => {
  const k1 = cacheKeyFor({ id: "a", contentHash: "hash1" });
  const k2 = cacheKeyFor({ id: "b", contentHash: "hash2" });
  assert.notEqual(k1, k2);
});

test("two files with same hash share a key regardless of id", () => {
  const k1 = cacheKeyFor({ id: "a", contentHash: "same" });
  const k2 = cacheKeyFor({ id: "b", contentHash: "same" });
  assert.equal(k1, k2);
});

// ─── estimateDocBytes ────────────────────────────────────────────────────────

test("estimateDocBytes is monotonically non-decreasing with more text", () => {
  const small = estimateDocBytes([makePage(1, "short")]);
  const large = estimateDocBytes([makePage(1, "a much longer line of text here")]);
  assert.ok(large >= small, `${large} should be >= ${small}`);
});

test("estimateDocBytes returns 0 for empty pages", () => {
  assert.equal(estimateDocBytes([]), 0);
});

test("estimateDocBytes counts chars * 2", () => {
  const pages = [makePage(1, "abc"), makePage(2, "de")];
  assert.equal(estimateDocBytes(pages), (3 + 2) * 2);
});

// ─── createPageTextCache ─────────────────────────────────────────────────────

test("get returns undefined for missing key", () => {
  const cache = createPageTextCache();
  assert.equal(cache.get("nope"), undefined);
});

test("set then get returns the doc", () => {
  const cache = createPageTextCache();
  const doc = makeDoc();
  cache.set("k1", doc);
  const got = cache.get("k1");
  assert.ok(got);
  assert.equal(got.verdict, "text");
  assert.equal(got.pages.length, 1);
});

test("get returns shallow copies of page objects — aliasing guard", () => {
  const cache = createPageTextCache();
  const doc = makeDoc([makePage(1, "original")]);
  cache.set("k1", doc);

  const first = cache.get("k1")!;
  first.pages[0].lines = ["mutated"];

  const second = cache.get("k1")!;
  assert.deepEqual(second.pages[0].lines, ["original"],
    "mutating the first get result must not affect cached data");
});

test("set overwrites existing entry and adjusts size", () => {
  const cache = createPageTextCache();
  const small = makeDoc([makePage(1, "a")]);
  const large = makeDoc([makePage(1, "a longer string for size")]);
  cache.set("k1", small);
  const sizeAfterSmall = cache.size();
  cache.set("k1", large);
  assert.ok(cache.size() > sizeAfterSmall);
});

test("delete removes entry and decreases size", () => {
  const cache = createPageTextCache();
  cache.set("k1", makeDoc());
  assert.ok(cache.size() > 0);
  assert.equal(cache.delete("k1"), true);
  assert.equal(cache.size(), 0);
  assert.equal(cache.get("k1"), undefined);
});

test("delete returns false for missing key", () => {
  const cache = createPageTextCache();
  assert.equal(cache.delete("nope"), false);
});

test("clear empties everything", () => {
  const cache = createPageTextCache();
  cache.set("a", makeDoc());
  cache.set("b", makeDoc());
  cache.clear();
  assert.equal(cache.size(), 0);
  assert.equal(cache.get("a"), undefined);
  assert.equal(cache.get("b"), undefined);
});

test("eviction removes oldest entries when over maxBytes", () => {
  // Set a small cap so eviction is triggered by a few entries.
  const cache = createPageTextCache(100);
  const bigText = "x".repeat(30);
  const doc1 = makeDoc([makePage(1, bigText)], { storedAt: 1000 });
  const doc2 = makeDoc([makePage(1, bigText)], { storedAt: 2000 });
  const doc3 = makeDoc([makePage(1, bigText)], { storedAt: 3000 });

  cache.set("oldest", doc1);
  cache.set("middle", doc2);
  // This third set should trigger eviction of the oldest.
  cache.set("newest", doc3);

  // newest should survive; oldest should be gone.
  assert.ok(cache.get("newest"), "newest should survive eviction");
  assert.equal(cache.get("oldest"), undefined, "oldest should have been evicted");
  assert.ok(cache.size() <= 100);
});

// ─── TEXT_CACHE_MAX_BYTES ────────────────────────────────────────────────────

test("TEXT_CACHE_MAX_BYTES is 64MB", () => {
  assert.equal(TEXT_CACHE_MAX_BYTES, 64 * 1024 * 1024);
});

// ─── size tracking ───────────────────────────────────────────────────────────

test("size is 0 on a fresh cache", () => {
  const cache = createPageTextCache();
  assert.equal(cache.size(), 0);
});

test("size never goes negative after delete", () => {
  const cache = createPageTextCache();
  cache.set("k", makeDoc([makePage(1, "a")]));
  cache.delete("k");
  cache.delete("k"); // double-delete
  assert.ok(cache.size() >= 0);
});

// ─── ocrLang on CachedDoc ───────────────────────────────────────────────────

test("ocrLang is preserved through set/get", () => {
  const cache = createPageTextCache();
  const doc = makeDoc([makePage(1, "hallo welt")], {
    ocrPages: [1],
    ocrLang: "deu",
  });
  cache.set("k", doc);
  const got = cache.get("k")!;
  assert.equal(got.ocrLang, "deu");
});

test("ocrLang is undefined when no OCR was performed", () => {
  const cache = createPageTextCache();
  const doc = makeDoc([makePage(1, "text only")]);
  cache.set("k", doc);
  const got = cache.get("k")!;
  assert.equal(got.ocrLang, undefined);
});

test("lang mismatch makes a cache entry unsuitable — engine guard scenario", () => {
  // This test verifies the invariant that engine.ts uses: a CachedDoc OCR'd
  // in "eng" should be treated as a miss when the user switches to "deu".
  // The cache itself stores and returns the doc faithfully; the mismatch
  // check is the engine's responsibility. This test documents the field.
  const cache = createPageTextCache();
  const doc = makeDoc([makePage(1, "english text")], {
    verdict: "scanned",
    textlessPages: [1],
    ocrPages: [1],
    ocrLang: "eng",
    complete: true,
  });
  cache.set("k", doc);
  const got = cache.get("k")!;

  // Engine guard: complete && ocrPages.length > 0 && ocrLang !== requestedLang
  const requestedLang = "deu";
  const langOk =
    got.ocrPages.length === 0 || got.ocrLang === requestedLang;
  assert.equal(langOk, false, "lang mismatch should make entry unsuitable");

  // Same language: entry IS suitable.
  const sameLang = "eng";
  const langOkSame =
    got.ocrPages.length === 0 || got.ocrLang === sameLang;
  assert.equal(langOkSame, true, "same lang should be a hit");

  // Text-only doc (ocrPages=[]) is always suitable.
  const textDoc = makeDoc([makePage(1, "pure text")], {
    verdict: "text",
    ocrPages: [],
    complete: true,
  });
  cache.set("k2", textDoc);
  const textGot = cache.get("k2")!;
  const textLangOk =
    textGot.ocrPages.length === 0 || textGot.ocrLang === requestedLang;
  assert.equal(textLangOk, true, "text-only doc is always suitable");
});
