import { test } from "node:test";
import assert from "node:assert/strict";
import { cn, formatBytes, truncate } from "../src/lib/utils.ts";

test("formatBytes: boundaries and rounding", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(1), "1 B");
  assert.equal(formatBytes(1023), "1023 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(1048575), "1024.0 KB");
  assert.equal(formatBytes(1048576), "1.0 MB");
  assert.equal(formatBytes(52428800), "50.0 MB");
});

test("truncate returns string unchanged when short enough", () => {
  assert.equal(truncate("hi", 10), "hi");
  assert.equal(truncate("exactlen", 8), "exactlen");
});

test("truncate appends ellipsis and respects max length", () => {
  const out = truncate("hello world", 8);
  assert.ok(out.length <= 8, `expected ≤8, got ${out.length}: "${out}"`);
  assert.ok(out.endsWith("…"));
});

test("cn: passthrough for a single class", () => {
  assert.equal(cn("p-2"), "p-2");
});

test("cn: falsy branches are dropped", () => {
  assert.equal(cn("p-2", false && "hidden", null, undefined, "text-xs"), "p-2 text-xs");
});

test("cn: tailwind-merge resolves later-wins conflicts", () => {
  // The whole reason we standardized on cn instead of raw clsx.
  assert.equal(cn("p-2", "p-4"), "p-4");
  assert.equal(cn("text-red-500", "text-blue-500"), "text-blue-500");
});

test("cn: custom class names pass through untouched", () => {
  assert.equal(cn("card", "p-4"), "card p-4");
});
