import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUa } from "../src/lib/analytics/ua.ts";

const CHROME_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const EDGE_WIN =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0";
const SAFARI_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const FIREFOX_LINUX =
  "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0";
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPAD_SAFARI =
  "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const SAMSUNG =
  "Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36";
const OPERA_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 OPR/111.0.0.0";
const CHROMEOS =
  "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

test("parseUa: Edge detected before Chrome (UA contains both tokens)", () => {
  assert.deepEqual(parseUa(EDGE_WIN), {
    device: "desktop",
    browser: "Edge",
    os: "Windows",
  });
});

test("parseUa: Chrome on Windows desktop", () => {
  assert.deepEqual(parseUa(CHROME_WIN), {
    device: "desktop",
    browser: "Chrome",
    os: "Windows",
  });
});

test("parseUa: Safari on macOS (Safari token also present in Chrome UAs)", () => {
  assert.deepEqual(parseUa(SAFARI_MAC), {
    device: "desktop",
    browser: "Safari",
    os: "macOS",
  });
});

test("parseUa: Firefox on Linux", () => {
  assert.deepEqual(parseUa(FIREFOX_LINUX), {
    device: "desktop",
    browser: "Firefox",
    os: "Linux",
  });
});

test("parseUa: iPhone is mobile + iOS (not macOS despite 'like Mac OS X')", () => {
  assert.deepEqual(parseUa(IPHONE_SAFARI), {
    device: "mobile",
    browser: "Safari",
    os: "iOS",
  });
});

test("parseUa: iPad is tablet + iOS", () => {
  assert.deepEqual(parseUa(IPAD_SAFARI), {
    device: "tablet",
    browser: "Safari",
    os: "iOS",
  });
});

test("parseUa: Android Chrome is mobile + Android (not Linux)", () => {
  assert.deepEqual(parseUa(ANDROID_CHROME), {
    device: "mobile",
    browser: "Chrome",
    os: "Android",
  });
});

test("parseUa: Samsung Internet detected before Chrome", () => {
  assert.deepEqual(parseUa(SAMSUNG), {
    device: "mobile",
    browser: "Samsung Internet",
    os: "Android",
  });
});

test("parseUa: Opera detected before Chrome", () => {
  assert.deepEqual(parseUa(OPERA_MAC), {
    device: "desktop",
    browser: "Opera",
    os: "macOS",
  });
});

test("parseUa: ChromeOS detected before Linux", () => {
  assert.deepEqual(parseUa(CHROMEOS), {
    device: "desktop",
    browser: "Chrome",
    os: "ChromeOS",
  });
});

test("parseUa: empty/unknown UA falls back to desktop/Other/Other", () => {
  assert.deepEqual(parseUa(""), {
    device: "desktop",
    browser: "Other",
    os: "Other",
  });
});
