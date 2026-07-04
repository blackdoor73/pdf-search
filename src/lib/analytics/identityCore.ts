/**
 * Identity model — pure logic, no browser APIs, unit-tested in
 * tests/identity.test.ts.
 *
 * IDENTITY SEMANTICS (documented behavior):
 *
 * anonymous id (aid)
 *   One per browser profile. Stored in the `pdfsearch_session` cookie
 *   (legacy name kept so existing visitors aren't re-counted) AND mirrored
 *   in localStorage — if either survives, identity survives. Regenerated
 *   only when both are gone: cookies+storage cleared, a different browser,
 *   a different device, or a fresh incognito window (each incognito window
 *   is intentionally a new visitor; it vanishes when the window closes).
 *   "Clear history" in the product deletes it deliberately — that is a
 *   user-facing privacy reset and creates a new visitor by design.
 *   No fingerprinting is used to bridge any of these gaps.
 *
 * session id (sid)
 *   One per period of activity, shared across tabs via localStorage.
 *   Expires after 30 minutes of inactivity; the next event starts a new
 *   session. Multiple simultaneous tabs share one session (last-write-wins
 *   on the activity timestamp; a sub-millisecond first-ever race between
 *   two brand-new tabs is possible and accepted — both converge on the
 *   next read).
 *
 * user id
 *   Reserved. The product has no authentication today. When it does,
 *   merge strategy: on login, emit an `identify` event carrying both ids
 *   and attribute the anon history server-side; never rewrite old rows.
 */

export const SESSION_TIMEOUT_MS = 30 * 60_000;
/** Skip persisting a session touch if the last one was this recent. */
export const SESSION_TOUCH_THROTTLE_MS = 15_000;

export interface SessionState {
  id: string;
  startedAt: number;
  lastActivity: number;
}

export interface AnonResolution {
  id: string;
  isNew: boolean;
  /** Cookie is missing/stale and should be (re)written. */
  healCookie: boolean;
  /** localStorage mirror is missing/stale and should be (re)written. */
  healMirror: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function valid(id: string | null | undefined): id is string {
  return typeof id === "string" && UUID_RE.test(id);
}

/**
 * Resolve the anonymous id from its two storage locations.
 * Cookie is authoritative (it predates the mirror); the mirror restores
 * identity when only the cookie was cleared, and vice versa.
 */
export function resolveAnonId(
  cookieVal: string | null,
  mirrorVal: string | null,
  newId: () => string
): AnonResolution {
  if (valid(cookieVal)) {
    return {
      id: cookieVal,
      isNew: false,
      healCookie: false,
      healMirror: mirrorVal !== cookieVal,
    };
  }
  if (valid(mirrorVal)) {
    return { id: mirrorVal, isNew: false, healCookie: true, healMirror: false };
  }
  return { id: newId(), isNew: true, healCookie: true, healMirror: true };
}

export interface SessionResolution {
  state: SessionState;
  isNew: boolean;
  /** Whether the caller should persist the state (throttled for touches). */
  shouldPersist: boolean;
}

/** Resolve the current session given the persisted state and the clock. */
export function resolveSession(
  prev: SessionState | null,
  now: number,
  newId: () => string
): SessionResolution {
  const expired =
    !prev ||
    !valid(prev.id) ||
    typeof prev.lastActivity !== "number" ||
    now - prev.lastActivity > SESSION_TIMEOUT_MS ||
    prev.lastActivity - now > 60_000; // future timestamp = corrupt clock/state

  if (expired) {
    return {
      state: { id: newId(), startedAt: now, lastActivity: now },
      isNew: true,
      shouldPersist: true,
    };
  }
  return {
    state: { ...prev, lastActivity: now },
    isNew: false,
    shouldPersist: now - prev.lastActivity > SESSION_TOUCH_THROTTLE_MS,
  };
}
