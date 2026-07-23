/**
 * SSRF-safe fetch with validated redirect following.
 *
 * `fetch(url, { redirect: "follow" })` validates only the initial URL —
 * intermediate hops slip past every SSRF check. This helper drives the
 * redirect chain manually, running validateProxyUrl on every hop, so:
 *   - a hop to a private IP or blocklisted host is blocked BEFORE the
 *     request is dispatched (no timing/status oracle for internal targets)
 *   - an https→http downgrade in the chain is rejected (validator is
 *     https-only)
 *   - the chain is bounded (default 3 hops)
 *   - one AbortSignal covers the whole chain
 *
 * Fetch is injectable for unit tests. Kept in a separate file with
 * relative imports so `node --test` can import it directly.
 */

import { validateProxyUrl } from "./index.ts";

export const MAX_REDIRECT_HOPS = 3;

export type ProxyFetchErrorCode =
  | "SSRF_BLOCKED"
  | "REDIRECT_LIMIT"
  | "REDIRECT_INVALID"
  | "FETCH_FAILED";

export interface ProxyFetchOk {
  ok: true;
  response: Response;
  /** Final URL after all validated redirects — use for filename derivation. */
  finalUrl: string;
  hops: number;
}

export interface ProxyFetchErr {
  ok: false;
  code: ProxyFetchErrorCode;
  error: string;
  /** Present when a redirect hop was itself blocked. */
  hop?: string;
}

export type ProxyFetchResult = ProxyFetchOk | ProxyFetchErr;

interface Options {
  signal: AbortSignal;
  fetchImpl?: typeof fetch;
  maxHops?: number;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Fetches `initialUrl`, following up to `maxHops` redirects, running
 * validateProxyUrl on every hop. Returns the terminal (non-redirect)
 * response along with the final validated URL, or a structured error.
 * Never throws for SSRF-shaped problems; only throws if the injected
 * fetch does something exotic outside AbortError.
 */
export async function fetchWithValidatedRedirects(
  initialUrl: string,
  headers: HeadersInit,
  { signal, fetchImpl = fetch, maxHops = MAX_REDIRECT_HOPS }: Options
): Promise<ProxyFetchResult> {
  // Initial URL is expected to have been validated by the caller, but
  // re-validate defensively so this helper is safe in isolation.
  const initialCheck = validateProxyUrl(initialUrl);
  if (!initialCheck.valid) {
    return {
      ok: false,
      code: "SSRF_BLOCKED",
      error: initialCheck.error ?? "Invalid URL",
    };
  }

  let currentUrl = initialCheck.sanitizedUrl!;

  for (let hop = 0; hop <= maxHops; hop++) {
    let response: Response;
    try {
      response = await fetchImpl(currentUrl, {
        signal,
        headers,
        redirect: "manual",
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      return {
        ok: false,
        code: "FETCH_FAILED",
        error: "Failed to fetch the URL. Check that it is accessible.",
      };
    }

    if (!REDIRECT_STATUSES.has(response.status)) {
      return { ok: true, response, finalUrl: currentUrl, hops: hop };
    }

    if (hop >= maxHops) {
      return {
        ok: false,
        code: "REDIRECT_LIMIT",
        error: `Redirect chain exceeded ${maxHops} hops`,
      };
    }

    const location = response.headers.get("location");
    if (!location) {
      return {
        ok: false,
        code: "REDIRECT_INVALID",
        error: "Redirect without Location header",
      };
    }

    let nextUrl: string;
    try {
      // Resolve relative locations against the current URL.
      nextUrl = new URL(location, currentUrl).toString();
    } catch {
      return {
        ok: false,
        code: "REDIRECT_INVALID",
        error: "Malformed redirect target",
      };
    }

    const nextCheck = validateProxyUrl(nextUrl);
    if (!nextCheck.valid) {
      return {
        ok: false,
        code: "SSRF_BLOCKED",
        error: `Redirect blocked: ${nextCheck.error ?? "unsafe target"}`,
        hop: nextUrl,
      };
    }

    currentUrl = nextCheck.sanitizedUrl!;
  }

  // Unreachable — the loop either returns a response, hits the hop cap,
  // or returns a structured error.
  return {
    ok: false,
    code: "REDIRECT_LIMIT",
    error: `Redirect chain exceeded ${maxHops} hops`,
  };
}
