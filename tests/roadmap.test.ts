import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FEATURE_STATUSES,
  FEATURE_STATUS_LABELS,
  isFeatureStatus,
} from "../src/lib/roadmap/types.ts";

test("every status has a display label", () => {
  for (const s of FEATURE_STATUSES) {
    assert.equal(typeof FEATURE_STATUS_LABELS[s], "string");
    assert.ok(FEATURE_STATUS_LABELS[s].length > 0);
  }
});

test("labels map has no keys beyond the declared statuses", () => {
  assert.deepEqual(
    Object.keys(FEATURE_STATUS_LABELS).sort(),
    [...FEATURE_STATUSES].sort()
  );
});

test("status order drives board column order", () => {
  // The board renders groups in this order; shipped must come last so the
  // open work is what a visitor sees first.
  assert.deepEqual(FEATURE_STATUSES, [
    "considering",
    "planned",
    "building",
    "shipped",
  ]);
});

test("isFeatureStatus accepts declared statuses", () => {
  for (const s of FEATURE_STATUSES) assert.ok(isFeatureStatus(s));
});

test("isFeatureStatus rejects anything else", () => {
  // A row edited by hand in the database must not crash the board — the
  // query layer falls back to "considering" on an unknown value.
  for (const bad of ["", "done", "Considering", "shipped ", "__proto__"]) {
    assert.ok(!isFeatureStatus(bad), `expected ${JSON.stringify(bad)} to be rejected`);
  }
});
