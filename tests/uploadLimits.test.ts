import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyFileSize,
  computeConcurrency,
  computeFileLimit,
  formatLimit,
  oversizeWarning,
  LIMIT_LOW,
  LIMIT_DEFAULT,
  LIMIT_HIGH,
  LIMIT_CEILING,
} from "../src/lib/upload/limits.ts";

const MB = 1024 * 1024;

test("unknown capability falls back to the proven default, never higher", () => {
  // Safari and Firefox expose neither signal. Guessing high here is how you
  // crash a stranger's tab, so this is the single most important case.
  assert.equal(computeFileLimit({}), LIMIT_DEFAULT);
  assert.equal(computeFileLimit(), LIMIT_DEFAULT);
  assert.equal(computeFileLimit({ hardwareConcurrency: 16 }), LIMIT_DEFAULT);
  assert.equal(computeFileLimit({ deviceMemory: NaN }), LIMIT_DEFAULT);
});

test("mobile always gets the low tier, regardless of reported RAM", () => {
  assert.equal(computeFileLimit({ isMobile: true }), LIMIT_LOW);
  assert.equal(
    computeFileLimit({ isMobile: true, deviceMemory: 8, hardwareConcurrency: 8 }),
    LIMIT_LOW
  );
});

test("low-memory desktops get the low tier", () => {
  assert.equal(computeFileLimit({ deviceMemory: 1 }), LIMIT_LOW);
  assert.equal(computeFileLimit({ deviceMemory: 2 }), LIMIT_LOW);
});

test("mid-range devices get the default tier", () => {
  assert.equal(computeFileLimit({ deviceMemory: 4, hardwareConcurrency: 4 }), LIMIT_DEFAULT);
  // 8GB but only 2 cores is not a capable machine.
  assert.equal(computeFileLimit({ deviceMemory: 8, hardwareConcurrency: 2 }), LIMIT_DEFAULT);
});

test("capable desktops get the high tier", () => {
  assert.equal(computeFileLimit({ deviceMemory: 8, hardwareConcurrency: 4 }), LIMIT_HIGH);
  assert.equal(computeFileLimit({ deviceMemory: 8, hardwareConcurrency: 16 }), LIMIT_HIGH);
});

test("no tier ever exceeds the absolute ceiling", () => {
  for (const cap of [
    {},
    { isMobile: true },
    { deviceMemory: 1 },
    { deviceMemory: 8, hardwareConcurrency: 32 },
  ]) {
    assert.ok(computeFileLimit(cap) <= LIMIT_CEILING);
  }
});

test("concurrency shrinks as average file size grows", () => {
  // Peak memory is roughly concurrency × file size.
  assert.equal(computeConcurrency(5 * MB, 5), 5);
  assert.equal(computeConcurrency(75 * MB, 5), 3); // 15MB avg
  assert.equal(computeConcurrency(200 * MB, 5), 2); // 40MB avg
});

test("a single file always runs alone", () => {
  assert.equal(computeConcurrency(50 * MB, 1), 1);
  assert.equal(computeConcurrency(0, 0), 1);
});

// ── Three-band sizing: the device tier warns, only the ceiling refuses ──────

test("files within the device tier load silently", () => {
  assert.equal(classifyFileSize(10 * MB, LIMIT_DEFAULT), "ok");
  assert.equal(classifyFileSize(LIMIT_DEFAULT, LIMIT_DEFAULT), "ok", "boundary is inclusive");
});

test("files over the device tier warn rather than being refused", () => {
  // The regression this guards: these used to be silently rejected.
  assert.equal(classifyFileSize(60 * MB, LIMIT_DEFAULT), "warn");
  assert.equal(classifyFileSize(30 * MB, LIMIT_LOW), "warn");
  assert.equal(classifyFileSize(LIMIT_CEILING, LIMIT_DEFAULT), "warn", "ceiling is inclusive");
});

test("only files past the absolute ceiling are rejected", () => {
  assert.equal(classifyFileSize(LIMIT_CEILING + 1, LIMIT_DEFAULT), "reject");
  assert.equal(classifyFileSize(500 * MB, LIMIT_HIGH), "reject");
});

test("a high-tier device still warns before the ceiling", () => {
  // Nothing between the top tier and the ceiling, so nothing warns there.
  assert.equal(classifyFileSize(LIMIT_HIGH, LIMIT_HIGH), "ok");
  assert.equal(classifyFileSize(LIMIT_HIGH + 1, LIMIT_HIGH), "reject");
});

test("oversizeWarning names the file and its real size", () => {
  const msg = oversizeWarning("report.pdf", 78 * MB);
  assert.match(msg, /report\.pdf/);
  assert.match(msg, /78MB/);
});

test("formatLimit renders whole megabytes", () => {
  assert.equal(formatLimit(LIMIT_LOW), "25MB");
  assert.equal(formatLimit(LIMIT_DEFAULT), "50MB");
  assert.equal(formatLimit(LIMIT_HIGH), "100MB");
});
