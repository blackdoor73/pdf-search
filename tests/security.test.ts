/**
 * Security module tests — SSRF validation, XSS-safe highlighting,
 * filename/query sanitization, PDF magic-byte validation, rate limiting.
 *
 * These lock in the invariants that the proxy route depends on.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateProxyUrl,
  escapeHtml,
  escapeRegex,
  createHighlightedHtml,
  sanitizeFilename,
  sanitizeSearchQuery,
  validatePdfBytes,
  checkRateLimit,
} from "../src/lib/security/index.ts";

// ─── validateProxyUrl ──────────────────────────────────────────────────────────

test("validateProxyUrl accepts a normal public HTTPS PDF URL", () => {
  const r = validateProxyUrl("https://example.com/reports/q4.pdf");
  assert.equal(r.valid, true);
  assert.equal(r.sanitizedUrl, "https://example.com/reports/q4.pdf");
});

test("validateProxyUrl requires HTTPS — http:// and other schemes rejected", () => {
  for (const url of [
    "http://example.com/x.pdf",
    "file:///etc/passwd",
    "gopher://example.com",
    "javascript:alert(1)",
    "ftp://example.com/x.pdf",
  ]) {
    assert.equal(validateProxyUrl(url).valid, false, `should reject ${url}`);
  }
});

test("validateProxyUrl blocks IP-literal hostnames (dotted IPv4 and IPv6)", () => {
  for (const url of [
    "https://127.0.0.1/x.pdf",
    "https://10.0.0.5/x.pdf",
    "https://192.168.1.1/x.pdf",
    "https://172.16.0.1/x.pdf",
    "https://169.254.169.254/latest/meta-data/",
    "https://[::1]/x.pdf",
    "https://[::ffff:127.0.0.1]/x.pdf",
    "https://[fe80::1]/x.pdf",
    "https://[fc00::1]/x.pdf",
    "https://8.8.8.8/x.pdf", // public IP still rejected — legit PDFs use hostnames
  ]) {
    assert.equal(validateProxyUrl(url).valid, false, `should reject ${url}`);
  }
});

test("validateProxyUrl catches WHATWG-canonicalized IP tricks", () => {
  // WHATWG URL normalizes 2130706433 → 127.0.0.1 as parsed.hostname
  const canonicalized = [
    "https://2130706433/x.pdf",
    "https://0x7f.0.0.1/x.pdf",
    "https://0177.0.0.1/x.pdf",
  ];
  for (const url of canonicalized) {
    try {
      new URL(url); // if WHATWG accepts it, we must reject in validation
    } catch {
      continue; // some Node versions reject at parse — also fine
    }
    assert.equal(validateProxyUrl(url).valid, false, `should reject ${url}`);
  }
});

test("validateProxyUrl blocks well-known internal hostnames", () => {
  for (const url of [
    "https://localhost/x.pdf",
    "https://metadata.google.internal/x.pdf",
  ]) {
    assert.equal(validateProxyUrl(url).valid, false, `should reject ${url}`);
  }
});

test("validateProxyUrl rejects URLs with embedded credentials", () => {
  const r = validateProxyUrl("https://user:pass@example.com/x.pdf");
  assert.equal(r.valid, false);
});

test("validateProxyUrl rejects overly long URLs and garbage input", () => {
  assert.equal(validateProxyUrl("").valid, false);
  assert.equal(validateProxyUrl("   ").valid, false);
  assert.equal(validateProxyUrl("not-a-url").valid, false);
  assert.equal(validateProxyUrl("https://" + "a".repeat(3000)).valid, false);
});

// ─── XSS-safe highlighting ─────────────────────────────────────────────────────

test("escapeHtml neutralizes tag boundaries and quotes", () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script>'),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
  );
});

test("escapeRegex handles all regex metacharacters", () => {
  const escaped = escapeRegex(".*+?^${}()|[]\\");
  // Every metachar should now match literally.
  assert.equal(new RegExp(escaped).test(".*+?^${}()|[]\\"), true);
});

test("createHighlightedHtml escapes first, then wraps matches — no raw HTML leaks", () => {
  const out = createHighlightedHtml(
    "hello <script>alert(1)</script> world",
    "script",
    false
  );
  // The raw `<script>` opener/closer must be HTML-escaped, so it can't
  // execute even though the substring "script" is highlighted.
  assert.ok(!out.includes("<script>"), "raw <script> tag must be escaped");
  assert.ok(!out.includes("</script>"), "raw </script> tag must be escaped");
  assert.ok(out.includes("<mark>"), "matches should be wrapped in <mark>");
  assert.ok(out.includes("&lt;"), "angle brackets must be escaped");
});

test("createHighlightedHtml XSS via search query is neutralized (query escaped first)", () => {
  const out = createHighlightedHtml("say hi", "hi", false);
  assert.equal(out, "say <mark>hi</mark>");
  // A malicious query is escaped before being turned into a regex.
  const attackerQuery = "<img src=x onerror=alert(1)>";
  const attacked = createHighlightedHtml("harmless text", attackerQuery, false);
  assert.ok(!attacked.includes("<img"));
});

test("createHighlightedHtml honors the caseSensitive flag", () => {
  const src = "Cat scattered CAT";
  // Case-insensitive: three "cat" substrings match (Cat, cat in scattered, CAT).
  const ci = createHighlightedHtml(src, "cat", false);
  assert.equal((ci.match(/<mark>/g) ?? []).length, 3);
  // Case-sensitive: only lowercase "cat" inside "scattered" matches.
  const cs = createHighlightedHtml(src, "cat", true);
  assert.equal((cs.match(/<mark>/g) ?? []).length, 1);
});

// ─── sanitizeFilename / sanitizeSearchQuery ────────────────────────────────────

test("sanitizeFilename strips path traversal, null bytes, and empty inputs", () => {
  // Strips directory components — anything up to and including the last
  // separator is removed, defeating "../../etc/passwd" → keeps only "passwd".
  assert.equal(sanitizeFilename("../../etc/passwd"), "passwd");
  assert.equal(sanitizeFilename("C:\\Windows\\System32\\evil.pdf"), "evil.pdf");
  assert.equal(sanitizeFilename("foo\0bar.pdf"), "foobar.pdf");
  assert.equal(sanitizeFilename(""), "document.pdf");
});

test("sanitizeSearchQuery caps length and trims", () => {
  const long = "x".repeat(1000);
  const out = sanitizeSearchQuery(long);
  assert.ok(out.length <= 500, `expected ≤500, got ${out.length}`);
  assert.equal(sanitizeSearchQuery("   hello   "), "hello");
});

// ─── validatePdfBytes ──────────────────────────────────────────────────────────

test("validatePdfBytes accepts %PDF magic bytes with correct content-type", () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
  assert.equal(validatePdfBytes(pdf, "application/pdf").valid, true);
  assert.equal(validatePdfBytes(pdf, "application/octet-stream").valid, true);
});

test("validatePdfBytes rejects HTML disguised as a PDF", () => {
  const html = new TextEncoder().encode("<!DOCTYPE html><html>...");
  assert.equal(validatePdfBytes(html, "application/pdf").valid, false);
});

test("validatePdfBytes rejects empty payload", () => {
  assert.equal(validatePdfBytes(new Uint8Array(), "application/pdf").valid, false);
});

// ─── checkRateLimit ────────────────────────────────────────────────────────────

test("checkRateLimit allows up to limit, then blocks, then resets after window", async () => {
  const key = `rl-test-${Math.random()}`;
  const limit = 3;
  const window = 100;
  for (let i = 0; i < limit; i++) {
    assert.equal(checkRateLimit(key, limit, window).allowed, true, `hit ${i}`);
  }
  assert.equal(checkRateLimit(key, limit, window).allowed, false);
  await new Promise((r) => setTimeout(r, window + 20));
  assert.equal(checkRateLimit(key, limit, window).allowed, true);
});
