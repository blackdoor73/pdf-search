/**
 * Analytics identity-model correctness tests (run: npm test).
 *
 * These encode the scenarios from the analytics audit: one browser must be
 * one visitor across refreshes, sessions, and tabs; sessions must expire
 * after 30 minutes of inactivity; bots must never become visitors.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAnonId,
  resolveSession,
  SESSION_TIMEOUT_MS,
  SESSION_TOUCH_THROTTLE_MS,
  type SessionState,
} from "../src/lib/analytics/identityCore.ts";
import { isBotUserAgent } from "../src/lib/analytics/bots.ts";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";
const newId = () => "99999999-9999-4999-8999-999999999999";

// ─── Anonymous id ──────────────────────────────────────────────────────────────

test("TEST 1: repeated visits with an existing cookie stay one visitor", () => {
  for (let refresh = 0; refresh < 10; refresh++) {
    const r = resolveAnonId(UUID_A, UUID_A, newId);
    assert.equal(r.id, UUID_A);
    assert.equal(r.isNew, false);
    assert.equal(r.healCookie, false);
    assert.equal(r.healMirror, false);
  }
});

test("first-ever visit mints exactly one new id and persists it everywhere", () => {
  const r = resolveAnonId(null, null, newId);
  assert.equal(r.isNew, true);
  assert.equal(r.healCookie, true);
  assert.equal(r.healMirror, true);
});

test("cookie cleared but mirror intact → same visitor, cookie healed", () => {
  const r = resolveAnonId(null, UUID_A, newId);
  assert.equal(r.id, UUID_A);
  assert.equal(r.isNew, false);
  assert.equal(r.healCookie, true);
});

test("mirror cleared but cookie intact → same visitor, mirror healed", () => {
  const r = resolveAnonId(UUID_A, null, newId);
  assert.equal(r.id, UUID_A);
  assert.equal(r.isNew, false);
  assert.equal(r.healMirror, true);
});

test("cookie is authoritative when the two stores disagree", () => {
  const r = resolveAnonId(UUID_A, UUID_B, newId);
  assert.equal(r.id, UUID_A);
  assert.equal(r.healMirror, true); // mirror converges to cookie
});

test("garbage in either store is ignored, not adopted", () => {
  const r = resolveAnonId("<script>", "not-a-uuid", newId);
  assert.equal(r.isNew, true);
});

// ─── Sessions ──────────────────────────────────────────────────────────────────

test("TEST 2: activity within 30 min continues the same session", () => {
  const t0 = 1_000_000;
  const first = resolveSession(null, t0, newId);
  assert.equal(first.isNew, true);

  let state: SessionState = first.state;
  // 20 page views over 25 minutes — one session throughout.
  for (let i = 1; i <= 20; i++) {
    const r = resolveSession(state, t0 + i * 75_000, newId);
    assert.equal(r.isNew, false);
    assert.equal(r.state.id, first.state.id);
    state = r.state;
  }
});

test("returning after >30 min inactivity starts a new session, same visitor", () => {
  const t0 = 1_000_000;
  const first = resolveSession(null, t0, newId);
  const later = resolveSession(first.state, t0 + SESSION_TIMEOUT_MS + 1, () => UUID_B);
  assert.equal(later.isNew, true);
  assert.notEqual(later.state.id, first.state.id);
});

test("returning at exactly the timeout boundary does not expire", () => {
  const t0 = 1_000_000;
  const first = resolveSession(null, t0, newId);
  const r = resolveSession(first.state, t0 + SESSION_TIMEOUT_MS, () => UUID_B);
  assert.equal(r.isNew, false);
});

test("TEST 6: a second tab reading shared state joins the existing session", () => {
  const t0 = 1_000_000;
  const tabA = resolveSession(null, t0, () => UUID_A);
  // Tab B opens 5 seconds later and reads what tab A persisted.
  const tabB = resolveSession(tabA.state, t0 + 5_000, () => UUID_B);
  assert.equal(tabB.isNew, false);
  assert.equal(tabB.state.id, UUID_A);
});

test("rapid events throttle persistence but never lose the session", () => {
  const t0 = 1_000_000;
  const first = resolveSession(null, t0, newId);
  const quick = resolveSession(first.state, t0 + 1_000, newId);
  assert.equal(quick.shouldPersist, false); // within throttle window
  const slower = resolveSession(first.state, t0 + SESSION_TOUCH_THROTTLE_MS + 1_000, newId);
  assert.equal(slower.shouldPersist, true);
});

test("corrupt persisted state (future timestamp) starts a clean session", () => {
  const now = 1_000_000;
  const corrupt: SessionState = { id: UUID_A, startedAt: now, lastActivity: now + 10 * 60_000 };
  const r = resolveSession(corrupt, now, () => UUID_B);
  assert.equal(r.isNew, true);
});

// ─── Bot filtering ─────────────────────────────────────────────────────────────

test("crawlers and automation are rejected at ingestion", () => {
  const bots = [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0)",
    "Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/120.0.0.0",
    "WhatsApp/2.23.20 A",
    "Slackbot-LinkExpanding 1.0",
    "curl/8.4.0",
    "python-requests/2.31",
    "GPTBot/1.0",
    "", // empty UA — no real browser sends nothing
  ];
  for (const ua of bots) {
    assert.equal(isBotUserAgent(ua), true, `should reject: "${ua}"`);
  }
});

test("real browsers are accepted", () => {
  const real = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
  ];
  for (const ua of real) {
    assert.equal(isBotUserAgent(ua), false, `should accept: "${ua}"`);
  }
});
