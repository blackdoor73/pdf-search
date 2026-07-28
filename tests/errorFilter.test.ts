import { test } from "node:test";
import assert from "node:assert/strict";
import { isNoiseError } from "../src/lib/analytics/errorFilter.ts";

test("wallet-extension rejections are noise", () => {
  // The six identical rows that filled the admin panel.
  assert.ok(isNoiseError({ message: "Internal JSON-RPC error." }));
  assert.ok(isNoiseError({ message: "User rejected the request." }));
  assert.ok(isNoiseError({ message: "MetaMask: lost connection" }));
  assert.ok(isNoiseError({ message: "window.ethereum is undefined" }));
});

test("errors thrown from browser extensions are noise", () => {
  for (const filename of [
    "chrome-extension://abcdef/inject.js",
    "moz-extension://1234/content.js",
    "safari-web-extension://XYZ/script.js",
    "webkit-masked-url://hidden/",
  ]) {
    assert.ok(
      isNoiseError({ message: "TypeError: x is not a function", filename }),
      `expected noise for ${filename}`
    );
  }
});

test("a stripped cross-origin 'Script error.' is noise", () => {
  assert.ok(isNoiseError({ message: "Script error." }));
  assert.ok(isNoiseError({ message: "Script error", filename: "" }));
});

test("'Script error.' that kept a filename is still reported", () => {
  // If the browser gave us a location, it is diagnosable — keep it.
  assert.equal(
    isNoiseError({
      message: "Script error.",
      filename: "https://www.pdfsearch.info/_next/static/chunks/main.js",
    }),
    false
  );
});

test("genuine app errors are never filtered", () => {
  const real = [
    {
      message: "TypeError: Cannot read properties of undefined (reading 'call')",
      filename: "https://www.pdfsearch.info/_next/static/chunks/page.js",
    },
    { message: "Search failed", filename: "" },
    { message: "Failed to fetch", filename: "" },
    { message: "Invalid PDF structure", filename: "/pdf.worker.min.mjs" },
  ];
  for (const e of real) {
    assert.equal(isNoiseError(e), false, `should keep: ${e.message}`);
  }
});

test("ResizeObserver loop warnings are noise", () => {
  assert.ok(
    isNoiseError({
      message: "ResizeObserver loop completed with undelivered notifications.",
    })
  );
});

test("empty and missing input does not crash and is not noise", () => {
  assert.equal(isNoiseError({}), false);
  assert.equal(isNoiseError({ message: null, filename: null }), false);
  assert.equal(isNoiseError({ message: "", filename: "" }), false);
});
