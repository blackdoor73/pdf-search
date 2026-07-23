/**
 * Redirect-following helper tests — the SSRF-critical piece of the
 * proxy route. Every hop is validated; stub fetch injected to simulate
 * chains without touching the network.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fetchWithValidatedRedirects,
  MAX_REDIRECT_HOPS,
} from "../src/lib/security/proxyFetch.ts";

const OK_HEADERS = { Accept: "application/pdf" };

function ac(): AbortSignal {
  return new AbortController().signal;
}

/** Build a stub fetch that walks a scripted sequence of URL → Response. */
function stubFetch(script: Array<{ url: string; response: Response }>): typeof fetch {
  let i = 0;
  return (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : (input as URL).toString();
    const step = script[i++];
    if (!step) throw new Error(`stubFetch: unexpected extra call to ${url}`);
    assert.equal(url, step.url, `stubFetch: hop ${i} expected ${step.url}, got ${url}`);
    return step.response;
  }) as typeof fetch;
}

function redirect(status: number, location: string) {
  return new Response(null, { status, headers: { location } });
}

function ok() {
  return new Response("body", { status: 200 });
}

test("returns the terminal response for a direct hit (0 redirects)", async () => {
  const fetchImpl = stubFetch([
    { url: "https://example.com/x.pdf", response: ok() },
  ]);
  const r = await fetchWithValidatedRedirects(
    "https://example.com/x.pdf",
    OK_HEADERS,
    { signal: ac(), fetchImpl }
  );
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.hops, 0);
    assert.equal(r.finalUrl, "https://example.com/x.pdf");
  }
});

test("follows up to MAX_REDIRECT_HOPS validated hops", async () => {
  const fetchImpl = stubFetch([
    { url: "https://a.com/1", response: redirect(302, "https://b.com/2") },
    { url: "https://b.com/2", response: redirect(301, "https://c.com/3") },
    { url: "https://c.com/3", response: ok() },
  ]);
  const r = await fetchWithValidatedRedirects("https://a.com/1", OK_HEADERS, {
    signal: ac(),
    fetchImpl,
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.hops, 2);
    assert.equal(r.finalUrl, "https://c.com/3");
  }
});

test("rejects a redirect hop targeting a private IP — no request dispatched", async () => {
  let hitInternal = false;
  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : (input as URL).toString();
    if (url === "https://a.com/x") {
      return redirect(302, "https://169.254.169.254/latest/meta-data/");
    }
    hitInternal = true;
    return ok();
  }) as typeof fetch;

  const r = await fetchWithValidatedRedirects("https://a.com/x", OK_HEADERS, {
    signal: ac(),
    fetchImpl,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "SSRF_BLOCKED");
  assert.equal(hitInternal, false, "internal target must never be fetched");
});

test("rejects an https→http downgrade in the redirect chain", async () => {
  const fetchImpl = stubFetch([
    { url: "https://a.com/x", response: redirect(302, "http://a.com/x") },
  ]);
  const r = await fetchWithValidatedRedirects("https://a.com/x", OK_HEADERS, {
    signal: ac(),
    fetchImpl,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "SSRF_BLOCKED");
});

test(`rejects chains longer than MAX_REDIRECT_HOPS (${MAX_REDIRECT_HOPS})`, async () => {
  const chain: Array<{ url: string; response: Response }> = [];
  for (let i = 0; i < MAX_REDIRECT_HOPS + 1; i++) {
    chain.push({
      url: `https://h${i}.com/x`,
      response: redirect(302, `https://h${i + 1}.com/x`),
    });
  }
  const fetchImpl = stubFetch(chain);
  const r = await fetchWithValidatedRedirects(
    "https://h0.com/x",
    OK_HEADERS,
    { signal: ac(), fetchImpl }
  );
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "REDIRECT_LIMIT");
});

test("resolves relative Location headers against the current URL", async () => {
  const fetchImpl = stubFetch([
    { url: "https://a.com/dir/x", response: redirect(302, "/other/y.pdf") },
    { url: "https://a.com/other/y.pdf", response: ok() },
  ]);
  const r = await fetchWithValidatedRedirects(
    "https://a.com/dir/x",
    OK_HEADERS,
    { signal: ac(), fetchImpl }
  );
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.finalUrl, "https://a.com/other/y.pdf");
});

test("rejects a redirect response with no Location header", async () => {
  const fetchImpl = stubFetch([
    { url: "https://a.com/x", response: new Response(null, { status: 302 }) },
  ]);
  const r = await fetchWithValidatedRedirects("https://a.com/x", OK_HEADERS, {
    signal: ac(),
    fetchImpl,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "REDIRECT_INVALID");
});

test("initial-URL validation gates the whole helper", async () => {
  // No fetch should ever be called — a bad initial URL short-circuits.
  const fetchImpl = (async () => {
    throw new Error("must not fetch");
  }) as typeof fetch;
  const r = await fetchWithValidatedRedirects(
    "http://example.com/x.pdf",
    OK_HEADERS,
    { signal: ac(), fetchImpl }
  );
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "SSRF_BLOCKED");
});
