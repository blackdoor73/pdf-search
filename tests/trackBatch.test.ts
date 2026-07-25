import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBatchLenient } from "../src/lib/analytics/events.ts";

const AID = "155917ac-a50e-4ef0-b5fa-8e49401d3e72";
const SID = "514e76fd-80bc-4826-ab14-011ae8e52625";

const envelope = (events: unknown[]) => ({ aid: AID, sid: SID, page: "/", events });

const validEvent = (e = "page_view") => ({
  id: crypto.randomUUID(),
  e,
  ts: Date.now(),
  props: { path: "/" },
});

test("a fully valid batch is parsed with nothing dropped", () => {
  const result = parseBatchLenient(envelope([validEvent(), validEvent("search")]));
  assert.ok(result);
  assert.equal(result.batch.events.length, 2);
  assert.equal(result.dropped.length, 0);
});

test("one invalid event does not discard the valid ones in the batch", () => {
  // The regression this guards: an over-long prop used to fail the whole
  // batch, silently losing every other event flushed in the same window.
  const result = parseBatchLenient(
    envelope([
      validEvent("page_view"),
      { ...validEvent("pdf_meta"), props: { keywords: "x".repeat(300) } },
      validEvent("search"),
    ])
  );
  assert.ok(result);
  assert.equal(result.batch.events.length, 2);
  assert.deepEqual(
    result.batch.events.map((ev) => ev.e),
    ["page_view", "search"]
  );
  assert.equal(result.dropped.length, 1);
  assert.equal(result.dropped[0].index, 1);
  assert.match(result.dropped[0].reason, /keywords/);
});

test("a non-UUID event id is dropped without taking the batch down", () => {
  const result = parseBatchLenient(
    envelope([{ id: "test-ping", e: "page_view", props: {} }, validEvent()])
  );
  assert.ok(result);
  assert.equal(result.batch.events.length, 1);
  assert.equal(result.dropped.length, 1);
});

test("an unknown event name is dropped", () => {
  const result = parseBatchLenient(envelope([validEvent("not_a_real_event")]));
  assert.equal(result, null);
});

test("null is returned when no event survives validation", () => {
  const result = parseBatchLenient(envelope([{ e: "nope" }, { e: "also_nope" }]));
  assert.equal(result, null);
});

test("a malformed envelope is rejected outright", () => {
  assert.equal(parseBatchLenient({ aid: "short", sid: SID, events: [validEvent()] }), null);
  assert.equal(parseBatchLenient({ aid: AID, sid: SID, events: [] }), null);
  assert.equal(parseBatchLenient(null), null);
});

test("batch metadata survives per-event filtering", () => {
  const result = parseBatchLenient({
    aid: AID,
    sid: SID,
    page: "/changelog",
    ref: "https://example.com",
    tz: "Asia/Kolkata",
    lang: "en-US",
    events: [validEvent(), { e: "bogus" }],
  });
  assert.ok(result);
  assert.equal(result.batch.page, "/changelog");
  assert.equal(result.batch.tz, "Asia/Kolkata");
  assert.equal(result.batch.lang, "en-US");
  assert.equal(result.batch.events.length, 1);
});
