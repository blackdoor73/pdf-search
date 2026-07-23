import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDocumentsQuery,
  clampDays,
  clampPage,
  clampPageSize,
  toCsv,
  type DocumentFilters,
} from "../src/lib/admin/queryHelpers.ts";

const base: DocumentFilters = { page: 1, pageSize: 25 };

test("clampDays: bounds and fallback", () => {
  assert.equal(clampDays(null), 30);
  assert.equal(clampDays("abc"), 30);
  assert.equal(clampDays("0"), 1);
  assert.equal(clampDays("7"), 7);
  assert.equal(clampDays("9999"), 180);
});

test("clampPage: bounds and fallback", () => {
  assert.equal(clampPage(null), 1);
  assert.equal(clampPage("-3"), 1);
  assert.equal(clampPage("2.9"), 2);
  assert.equal(clampPage("99999999"), 10_000);
});

test("clampPageSize: bounds and fallback", () => {
  assert.equal(clampPageSize(null), 25);
  assert.equal(clampPageSize("0"), 25);
  assert.equal(clampPageSize("50"), 50);
  assert.equal(clampPageSize("5000"), 100);
});

test("toCsv: escapes quotes, commas, and nulls", () => {
  const csv = toCsv(
    ["name", "note"],
    [
      ['he said "hi"', "a,b"],
      [null, 42],
    ]
  );
  assert.equal(
    csv,
    '"name","note"\n"he said ""hi""","a,b"\n"","42"'
  );
});

test("buildDocumentsQuery: no filters → TRUE where, ts DESC default sort", () => {
  const { text, countText, params } = buildDocumentsQuery(base);
  assert.equal(params.length, 0);
  assert.match(text, /WHERE TRUE/);
  assert.match(text, /ORDER BY ts DESC NULLS LAST, id DESC/);
  assert.match(text, /LIMIT \$1 OFFSET \$2/);
  assert.match(countText, /WHERE TRUE/);
});

test("buildDocumentsQuery: all values parameterized, none inlined", () => {
  const { text, params } = buildDocumentsQuery({
    ...base,
    q: "report'; DROP TABLE pdf_documents;--",
    from: "2026-01-01",
    to: "2026-06-30",
    minPages: 2,
    maxPages: 100,
    minBytes: 1024,
    maxBytes: 1048576,
    status: "ok",
    source: "file",
  });
  assert.equal(params.length, 9);
  // The malicious filename value must only appear in params, never in SQL text.
  assert.ok(!text.includes("DROP TABLE"));
  for (let i = 1; i <= 9; i++) assert.ok(text.includes(`$${i}`), `missing $${i}`);
});

test("buildDocumentsQuery: sort/dir are whitelist-validated", () => {
  const bad = buildDocumentsQuery({
    ...base,
    sort: "ts; DROP TABLE events" as DocumentFilters["sort"],
    dir: "asc",
  });
  assert.match(bad.text, /ORDER BY ts ASC/);
  assert.ok(!bad.text.includes("DROP"));

  const size = buildDocumentsQuery({ ...base, sort: "size_bytes", dir: "desc" });
  assert.match(size.text, /ORDER BY size_bytes DESC/);
});

test("buildDocumentsQuery: invalid dates are ignored", () => {
  const { params } = buildDocumentsQuery({
    ...base,
    from: "not-a-date",
    to: "2026-13-99'; --",
  });
  assert.equal(params.length, 0);
});

test("buildDocumentsQuery: dupesOnly adds sha256 group subquery without params", () => {
  const { text, params } = buildDocumentsQuery({ ...base, dupesOnly: true });
  assert.equal(params.length, 0);
  assert.match(text, /HAVING count\(\*\) > 1/);
});
