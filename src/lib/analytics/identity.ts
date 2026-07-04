/**
 * Browser bindings for the identity model (pure logic in identityCore.ts).
 *
 * - Anonymous id: `pdfsearch_session` cookie (legacy name, existing
 *   visitors keep their identity) + localStorage mirror; each heals the
 *   other if only one was cleared.
 * - Session id: localStorage, shared across tabs, 30-min inactivity
 *   expiry, touch writes throttled to avoid multi-tab write storms.
 */

import {
  resolveAnonId,
  resolveSession,
  type SessionState,
} from "./identityCore";

const ANON_COOKIE = "pdfsearch_session"; // shared with userHistory.ts on purpose
const ANON_MIRROR_KEY = "pdfsearch_anon_id";
const SESSION_STATE_KEY = "pdfsearch_session_state";
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(
      new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)")
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string): void {
  try {
    const secureFlag = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; SameSite=Strict; Path=/${secureFlag}`;
  } catch {
    // Cookie write blocked — the localStorage mirror still carries identity.
  }
}

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private-mode quota or disabled storage — degrade to cookie-only.
  }
}

export interface Identity {
  aid: string;
  sid: string;
  /** True the first time this call opened a brand-new session. */
  sessionIsNew: boolean;
}

/**
 * Resolve (and persist) the current identity. Called on every tracked
 * event so session activity stays fresh; all writes are cheap and
 * throttled.
 */
export function getIdentity(now = Date.now()): Identity {
  const anon = resolveAnonId(
    getCookie(ANON_COOKIE),
    storageGet(ANON_MIRROR_KEY),
    () => crypto.randomUUID()
  );
  if (anon.healCookie) setCookie(ANON_COOKIE, anon.id);
  if (anon.healMirror) storageSet(ANON_MIRROR_KEY, anon.id);

  let prev: SessionState | null = null;
  try {
    const raw = storageGet(SESSION_STATE_KEY);
    if (raw) prev = JSON.parse(raw) as SessionState;
  } catch {
    prev = null;
  }

  const session = resolveSession(prev, now, () => crypto.randomUUID());
  if (session.shouldPersist) {
    storageSet(SESSION_STATE_KEY, JSON.stringify(session.state));
  }

  return { aid: anon.id, sid: session.state.id, sessionIsNew: session.isNew };
}
