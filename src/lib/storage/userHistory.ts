/**
 * User History Storage — Cookie-based implementation
 *
 * Stores only metadata (filenames, URLs, search queries) in cookies.
 * NEVER stores file content or any PII.
 *
 * Architecture note: Implements IUserRepository so this can be swapped
 * for a MongoDB implementation without changing any call sites.
 *
 * Migration path to MongoDB:
 * 1. Create MongoUserRepository implementing IUserRepository
 * 2. In getUserRepository(), check env var USE_MONGO and return the right impl
 * 3. No other code changes needed
 */

import { v4 as uuidv4 } from "uuid";
import type {
  UserHistory,
  HistoryEntry,
  SearchHistoryEntry,
  IUserRepository,
} from "@/types";

// ─── Cookie Config ─────────────────────────────────────────────────────────────

const SESSION_COOKIE = "pdfsearch_session";
const HISTORY_COOKIE = "pdfsearch_history";

/** Max files to remember in history */
const MAX_FILE_HISTORY = 50;
/** Max searches to remember */
const MAX_SEARCH_HISTORY = 20;
/** Cookie TTL: 90 days */
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60;

// ─── Cookie helpers (browser-side only) ───────────────────────────────────────

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === "undefined") return;
  // Secure flags: SameSite=Strict prevents CSRF; Secure requires HTTPS
  // In development (HTTP), omit Secure flag
  const isProduction = location.protocol === "https:";
  const secureFlag = isProduction ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; SameSite=Strict; Path=/${secureFlag}`;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; Path=/`;
}

// ─── Session ID Management ─────────────────────────────────────────────────────

/**
 * Gets or creates an anonymous session ID.
 * This ID is stored in a cookie and is the only persistent identifier.
 * It is NOT linked to any PII.
 */
export function getOrCreateSessionId(): string {
  let sessionId = getCookie(SESSION_COOKIE);
  if (!sessionId) {
    sessionId = uuidv4();
    setCookie(SESSION_COOKIE, sessionId, COOKIE_MAX_AGE);
  }
  return sessionId;
}

// ─── Cookie-based Repository ───────────────────────────────────────────────────

export class CookieUserRepository implements IUserRepository {
  private loadHistory(): UserHistory | null {
    try {
      const raw = getCookie(HISTORY_COOKIE);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as UserHistory;
      // Basic schema validation
      if (!parsed.sessionId || !Array.isArray(parsed.recentFiles)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private saveHistory(history: UserHistory): void {
    try {
      const serialized = JSON.stringify(history);
      // Guard against cookie size limits (~4KB)
      if (serialized.length > 3500) {
        // Trim history to fit
        history.recentFiles = history.recentFiles.slice(-20);
        history.recentSearches = history.recentSearches.slice(-10);
      }
      setCookie(HISTORY_COOKIE, JSON.stringify(history), COOKIE_MAX_AGE);
    } catch {
      // Non-fatal — history is a convenience feature
      console.warn("[History] Failed to save history to cookie");
    }
  }

  async getSession(sessionId: string): Promise<UserHistory | null> {
    const history = this.loadHistory();
    if (!history || history.sessionId !== sessionId) return null;
    return history;
  }

  async upsertSession(history: UserHistory): Promise<void> {
    this.saveHistory(history);
  }

  async addFileToHistory(sessionId: string, entry: HistoryEntry): Promise<void> {
    const now = Date.now();
    let history = this.loadHistory();

    if (!history) {
      history = {
        sessionId,
        recentFiles: [],
        recentSearches: [],
        createdAt: now,
        updatedAt: now,
      };
    }

    // Deduplicate by URL for URL-type entries
    if (entry.type === "url") {
      history.recentFiles = history.recentFiles.filter(
        (f) => f.url !== entry.url
      );
    }

    // Add to front, keep max count
    history.recentFiles = [entry, ...history.recentFiles].slice(
      0,
      MAX_FILE_HISTORY
    );
    history.updatedAt = now;
    this.saveHistory(history);
  }

  async addSearchToHistory(
    sessionId: string,
    entry: SearchHistoryEntry
  ): Promise<void> {
    const now = Date.now();
    let history = this.loadHistory();

    if (!history) {
      history = {
        sessionId,
        recentFiles: [],
        recentSearches: [],
        createdAt: now,
        updatedAt: now,
      };
    }

    // Deduplicate by query
    history.recentSearches = history.recentSearches.filter(
      (s) => s.query !== entry.query
    );
    history.recentSearches = [entry, ...history.recentSearches].slice(
      0,
      MAX_SEARCH_HISTORY
    );
    history.updatedAt = now;
    this.saveHistory(history);
  }

  async clearHistory(sessionId: string): Promise<void> {
    deleteCookie(HISTORY_COOKIE);
    deleteCookie(SESSION_COOKIE);
  }
}

// ─── Singleton factory (dependency injection point) ───────────────────────────
// MONGO MIGRATION: Change this function to return MongoUserRepository
// when process.env.USE_MONGO === 'true'

let _repo: IUserRepository | null = null;

export function getUserRepository(): IUserRepository {
  if (!_repo) {
    // Future: if (process.env.NEXT_PUBLIC_USE_MONGO) return new MongoUserRepository()
    _repo = new CookieUserRepository();
  }
  return _repo;
}

// ─── Convenience helpers ───────────────────────────────────────────────────────

export function getFullHistory(): UserHistory | null {
  const repo = new CookieUserRepository();
  const sessionId = getCookie(SESSION_COOKIE);
  if (!sessionId) return null;
  // Synchronous read for convenience
  try {
    const raw = getCookie(HISTORY_COOKIE);
    if (!raw) return null;
    return JSON.parse(raw) as UserHistory;
  } catch {
    return null;
  }
}
