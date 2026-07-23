import { test } from "node:test";
import assert from "node:assert/strict";
import { changelog, latestEntryDate } from "../src/lib/changelog.ts";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

test("every entry has a valid ISO date, title, tag, and items", () => {
  for (const e of changelog) {
    assert.match(e.date, ISO, `bad date: ${e.date}`);
    assert.ok(!Number.isNaN(Date.parse(e.date)), `unparseable date: ${e.date}`);
    assert.ok(e.title.length > 0);
    assert.ok(["new", "improved", "fixed"].includes(e.tag), `bad tag: ${e.tag}`);
    assert.ok(Array.isArray(e.items) && e.items.length > 0);
  }
});

test("entries are ordered newest-first", () => {
  for (let i = 1; i < changelog.length; i++) {
    assert.ok(
      changelog[i - 1].date >= changelog[i].date,
      `out of order at index ${i}: ${changelog[i - 1].date} < ${changelog[i].date}`
    );
  }
});

test("latestEntryDate returns the maximum date", () => {
  assert.equal(
    latestEntryDate(changelog),
    changelog.map((e) => e.date).sort().at(-1)
  );
});

test("latestEntryDate is empty for an empty changelog", () => {
  assert.equal(latestEntryDate([]), "");
});
