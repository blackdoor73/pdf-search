import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildFeedbackQuery,
  type FeedbackFilters,
} from "../src/lib/admin/queryHelpers.ts";

const base: FeedbackFilters = { page: 1, pageSize: 25 };

test("no filters → TRUE where, ts DESC, paginated", () => {
  const { text, countText, params } = buildFeedbackQuery(base);
  assert.equal(params.length, 0);
  assert.match(text, /WHERE TRUE/);
  assert.match(text, /ORDER BY ts DESC, id DESC/);
  assert.match(text, /LIMIT \$1 OFFSET \$2/);
  assert.match(countText, /new_count/);
});

test("all values parameterized; injection lands in params only", () => {
  const { text, params } = buildFeedbackQuery({
    ...base,
    q: "'; DROP TABLE feedback;--",
    category: "bug",
    status: "new",
    from: "2026-01-01",
    to: "2026-06-30",
  });
  assert.equal(params.length, 5);
  assert.ok(!text.includes("DROP TABLE"));
  for (let i = 1; i <= 5; i++) assert.ok(text.includes(`$${i}`), `missing $${i}`);
});

test("invalid category is ignored (whitelist)", () => {
  const { params } = buildFeedbackQuery({ ...base, category: "ai-response" });
  assert.equal(params.length, 0);
});

test("invalid status is ignored", () => {
  const { params } = buildFeedbackQuery({
    ...base,
    status: "deleted" as FeedbackFilters["status"],
  });
  assert.equal(params.length, 0);
});

test("shape-invalid dates are ignored (calendar validity is left to Postgres)", () => {
  // "nope" fails the YYYY-MM-DD shape check and is dropped. A shape-valid
  // but calendar-invalid date like 2026-13-40 passes the filter and is
  // parameterized; Postgres rejects the ::date cast at query time.
  const { params } = buildFeedbackQuery({ ...base, from: "nope", to: "not-a-date" });
  assert.equal(params.length, 0);
});
