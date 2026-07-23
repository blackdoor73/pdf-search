import { test } from "node:test";
import assert from "node:assert/strict";
import { feedbackSchema } from "../src/lib/feedback/schema.ts";

const valid = {
  category: "bug",
  message: "The search button does nothing when I click it twice quickly.",
};

test("accepts a minimal valid submission", () => {
  const r = feedbackSchema.safeParse(valid);
  assert.ok(r.success);
});

test("rejects an unknown category", () => {
  const r = feedbackSchema.safeParse({ ...valid, category: "ai-response" });
  assert.ok(!r.success);
});

test("rejects a too-short message", () => {
  const r = feedbackSchema.safeParse({ ...valid, message: "too short" });
  assert.ok(!r.success);
});

test("rejects a message over the max length", () => {
  const r = feedbackSchema.safeParse({ ...valid, message: "x".repeat(2001) });
  assert.ok(!r.success);
});

test("accepts an empty email (anonymous) and a valid email", () => {
  assert.ok(feedbackSchema.safeParse({ ...valid, email: "" }).success);
  assert.ok(feedbackSchema.safeParse({ ...valid, email: "a@b.com" }).success);
});

test("rejects a malformed email", () => {
  const r = feedbackSchema.safeParse({ ...valid, email: "not-an-email" });
  assert.ok(!r.success);
});

test("honeypot must be empty — a filled website field is rejected", () => {
  const r = feedbackSchema.safeParse({ ...valid, website: "http://spam.example" });
  assert.ok(!r.success);
});

test("all six categories are accepted", () => {
  for (const category of ["bug", "feature", "general", "ui-ux", "performance", "other"]) {
    assert.ok(feedbackSchema.safeParse({ ...valid, category }).success, category);
  }
});
