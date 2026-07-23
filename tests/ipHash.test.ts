import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { hashIp } from "../src/lib/analytics/ipHash.ts";

beforeEach(() => {
  delete process.env.IP_HASH_SECRET;
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_PASSWORD;
});

test("hashIp: null without any secret configured", async () => {
  assert.equal(await hashIp("203.0.113.7"), null);
});

test("hashIp: null for empty or unknown ip", async () => {
  process.env.IP_HASH_SECRET = "s3cret";
  assert.equal(await hashIp(""), null);
  assert.equal(await hashIp("unknown"), null);
});

test("hashIp: deterministic for same ip + secret, 32 hex chars", async () => {
  process.env.IP_HASH_SECRET = "s3cret";
  const a = await hashIp("203.0.113.7");
  const b = await hashIp("203.0.113.7");
  assert.equal(a, b);
  assert.match(a!, /^[0-9a-f]{32}$/);
});

test("hashIp: different ips produce different hashes", async () => {
  process.env.IP_HASH_SECRET = "s3cret";
  assert.notEqual(await hashIp("203.0.113.7"), await hashIp("203.0.113.8"));
});

test("hashIp: different secrets produce different hashes (key cache busts)", async () => {
  process.env.IP_HASH_SECRET = "secret-one";
  const a = await hashIp("203.0.113.7");
  process.env.IP_HASH_SECRET = "secret-two";
  const b = await hashIp("203.0.113.7");
  assert.notEqual(a, b);
});

test("hashIp: falls back to ADMIN_SESSION_SECRET then ADMIN_PASSWORD", async () => {
  process.env.ADMIN_PASSWORD = "pw";
  const viaPassword = await hashIp("203.0.113.7");
  assert.match(viaPassword!, /^[0-9a-f]{32}$/);

  process.env.ADMIN_SESSION_SECRET = "session-secret";
  const viaSession = await hashIp("203.0.113.7");
  assert.notEqual(viaPassword, viaSession);
});
