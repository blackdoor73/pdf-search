// ─── PDF Source Types ──────────────────────────────────────────────────────────

export type PdfSourceType = "file" | "url";

export interface PdfFile {
  id: string;
  name: string;
  type: PdfSourceType;
  /** File object for local uploads; string URL for remote */
  source: File | string;
  /** Human-readable size string */
  size: string;
  /** Raw byte size for validation */
  byteSize: number;
  /** SHA-256 hash of content (computed after load) for deduplication */
  contentHash?: string;
  /** Processing state */
  status: PdfStatus;
  /** Error message if status === 'error' */
  error?: string;
}

export type PdfStatus =
  | "pending"
  | "loading"
  | "ready"
  | "searching"
  | "done"
  | "error";

// ─── Search Types ──────────────────────────────────────────────────────────────

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  showContext: boolean;
}

export interface SearchMatch {
  page: number;
  lineIndex: number;
  text: string;
  /** Pre-highlighted HTML string (XSS-safe) */
  highlightedHtml: string;
}

export interface SearchResult {
  fileId: string;
  fileName: string;
  sourceType: PdfSourceType;
  /** Original URL if source was URL */
  sourceUrl?: string;
  matches: SearchMatch[];
  /** Pages that contain at least one match */
  matchedPages: number[];
  totalPages: number;
  /** Time taken to search this file in ms */
  searchDurationMs: number;
}

export interface SearchState {
  status: "idle" | "running" | "complete" | "error";
  query: string;
  results: SearchResult[];
  totalMatches: number;
  filesSearched: number;
  filesWithMatches: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

// ─── History Types (cookie-persisted, NO file content) ────────────────────────

export interface HistoryEntry {
  id: string;
  name: string;
  type: PdfSourceType;
  /** Only stored for URL type — never store File blobs in cookies */
  url?: string;
  addedAt: number;
  /** Last search query used with this file */
  lastQuery?: string;
}

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
  matchCount: number;
}

export interface UserHistory {
  /** Anonymous session identifier — never tied to PII */
  sessionId: string;
  recentFiles: HistoryEntry[];
  recentSearches: SearchHistoryEntry[];
  createdAt: number;
  updatedAt: number;
}

// ─── API Types ────────────────────────────────────────────────────────────────

export interface ProxyPdfResponse {
  /** Base64-encoded PDF bytes */
  data: string;
  /** Detected content type — must be application/pdf */
  contentType: string;
  /** Byte size for validation */
  size: number;
  /** Filename derived from URL */
  filename: string;
}

export interface ProxyPdfError {
  error: string;
  code:
    | "INVALID_URL"
    | "SSRF_BLOCKED"
    | "FETCH_FAILED"
    | "INVALID_CONTENT_TYPE"
    | "FILE_TOO_LARGE"
    | "TIMEOUT"
    | "RATE_LIMITED";
}

// ─── Progress Types ───────────────────────────────────────────────────────────

export interface SearchProgress {
  total: number;
  completed: number;
  currentFile: string;
  percentage: number;
}

// ─── Migration Interface (Future MongoDB) ────────────────────────────────────
// When migrating from cookie-based to MongoDB persistence:
// 1. Implement this interface with a MongoUserRepository class
// 2. The cookie-based impl (CookieUserRepository) already satisfies this contract
// 3. Swap at the dependency injection point in useUserHistory hook

export interface IUserRepository {
  getSession(sessionId: string): Promise<UserHistory | null>;
  upsertSession(history: UserHistory): Promise<void>;
  addFileToHistory(sessionId: string, entry: HistoryEntry): Promise<void>;
  addSearchToHistory(
    sessionId: string,
    entry: SearchHistoryEntry
  ): Promise<void>;
  clearHistory(sessionId: string): Promise<void>;
}
