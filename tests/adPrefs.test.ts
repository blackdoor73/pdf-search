import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AD_RAIL_MIN_WIDTH,
  DEFAULT_AD_PREF,
  parseAdPref,
  shouldShowRail,
  adsTxtLine,
} from "../src/lib/ads/prefs.ts";

const PUB = "ca-pub-1234567890123456";

test("ads default to on", () => {
  assert.equal(DEFAULT_AD_PREF, "on");
  assert.equal(parseAdPref(null), "on");
  assert.equal(parseAdPref(undefined), "on");
});

test("only the exact string 'off' opts out", () => {
  assert.equal(parseAdPref("off"), "off");
  // Anything else is treated as consent-to-default rather than opt-out, so a
  // corrupted value cannot silently disable the rail.
  for (const v of ["OFF", "Off", "false", "0", "", "no", "off "]) {
    assert.equal(parseAdPref(v), "on", `expected ${JSON.stringify(v)} → on`);
  }
});

test("no rail without a publisher id", () => {
  // The kill switch: before AdSense approval nothing renders, whatever the
  // preference or viewport says.
  assert.equal(
    shouldShowRail({ pref: "on", viewportWidth: 1920, publisherId: undefined }),
    false
  );
  assert.equal(
    shouldShowRail({ pref: "on", viewportWidth: 1920, publisherId: "" }),
    false
  );
  assert.equal(
    shouldShowRail({ pref: "on", viewportWidth: 1920, publisherId: null }),
    false
  );
});

test("opting out beats everything", () => {
  assert.equal(
    shouldShowRail({ pref: "off", viewportWidth: 2560, publisherId: PUB }),
    false
  );
});

test("rail appears only at or above the width threshold", () => {
  const at = (w: number) =>
    shouldShowRail({ pref: "on", viewportWidth: w, publisherId: PUB });

  assert.equal(at(AD_RAIL_MIN_WIDTH), true, "inclusive at the threshold");
  assert.equal(at(AD_RAIL_MIN_WIDTH - 1), false, "one pixel under is excluded");
  assert.equal(at(1920), true);
  // Phones and tablets must never see it.
  assert.equal(at(375), false);
  assert.equal(at(768), false);
  assert.equal(at(1024), false);
});

test("threshold leaves room for the unit beside the content column", () => {
  // Content is max-w-5xl (1024px). The rail is 160px wide and must not
  // crowd it, so the threshold has to exceed 1024 + 160 by a real margin.
  assert.ok(AD_RAIL_MIN_WIDTH >= 1024 + 160 + 64);
});

test("ads.txt line is valid for either id form", () => {
  // AdSense displays "ca-pub-…"; ads.txt requires "pub-…". Emitting the raw
  // value produced "pub-ca-pub-…", which silently voids the whole file.
  const expected =
    "google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0";
  assert.equal(adsTxtLine("ca-pub-1234567890123456"), expected);
  assert.equal(adsTxtLine("pub-1234567890123456"), expected);
  assert.equal(adsTxtLine("1234567890123456"), expected);
  assert.equal(adsTxtLine("  ca-pub-1234567890123456  "), expected);
});

test("ads.txt line never doubles the pub prefix", () => {
  for (const id of ["ca-pub-9", "pub-9", "9", "CA-PUB-9"]) {
    assert.equal((adsTxtLine(id).match(/pub-/gi) || []).length, 1, id);
  }
});
