/**
 * In-session text cache for extracted PDF pages.
 *
 * Stores the output of extractPdfText (and, once merged, OCR text) so repeat
 * searches never re-open pdf.js or re-run recognition. The cache is keyed by
 * content hash when available, falling back to the PdfFile id.
 *
 * ALIASING INVARIANT: callers of `get` receive shallow copies of the page
 * objects (`{ ...p }`) so the OCR merge in engine.ts (which assigns
 * `page.lines = lines` in place) cannot silently overwrite cached entries.
 * The inner `string[]` arrays ARE shared — they are only ever replaced
 * wholesale, never mutated element-wise — so the copy is cheap. Do not
 * introduce element-level mutation of `lines` without revisiting this.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CachedPage {
  pageNum: number;
  lines: string[];
  textChars: number;
  fromOcr?: boolean;
}

export interface CachedDoc {
  pages: CachedPage[];
  verdict: "text" | "scanned" | "mixed";
  textlessPages: number[];
  ocrPages: number[];
  /** True when every textless page has OCR text (or none was needed). */
  complete: boolean;
  /** Approximate retained bytes, for the eviction cap. */
  bytes: number;
  storedAt: number;
}

export interface PageTextCache {
  get(key: string): CachedDoc | undefined;
  set(key: string, doc: CachedDoc): void;
  delete(key: string): boolean;
  clear(): void;
  /** Total approximate bytes retained. */
  size(): number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const TEXT_CACHE_MAX_BYTES = 64 * 1024 * 1024;

export function cacheKeyFor(file: {
  id: string;
  contentHash?: string;
}): string {
  return file.contentHash ? `content:${file.contentHash}` : `id:${file.id}`;
}

export function estimateDocBytes(pages: CachedPage[]): number {
  let chars = 0;
  for (const p of pages) {
    for (const line of p.lines) chars += line.length;
  }
  return chars * 2;
}

// ─── In-memory implementation ────────────────────────────────────────────────

export function createPageTextCache(
  maxBytes: number = TEXT_CACHE_MAX_BYTES
): PageTextCache {
  const store = new Map<string, CachedDoc>();
  let totalBytes = 0;

  function evict(): void {
    while (totalBytes > maxBytes && store.size > 0) {
      let oldestKey: string | undefined;
      let oldestTime = Infinity;
      for (const [key, doc] of store) {
        if (doc.storedAt < oldestTime) {
          oldestTime = doc.storedAt;
          oldestKey = key;
        }
      }
      if (!oldestKey) break;
      const removed = store.get(oldestKey)!;
      store.delete(oldestKey);
      totalBytes -= removed.bytes;
    }
    if (totalBytes < 0) totalBytes = 0;
  }

  return {
    get(key) {
      const doc = store.get(key);
      if (!doc) return undefined;
      return {
        ...doc,
        pages: doc.pages.map((p) => ({ ...p })),
      };
    },

    set(key, doc) {
      const existing = store.get(key);
      if (existing) totalBytes -= existing.bytes;
      totalBytes += doc.bytes;
      store.set(key, doc);
      evict();
    },

    delete(key) {
      const existing = store.get(key);
      if (!existing) return false;
      totalBytes -= existing.bytes;
      if (totalBytes < 0) totalBytes = 0;
      return store.delete(key);
    },

    clear() {
      store.clear();
      totalBytes = 0;
    },

    size() {
      return totalBytes;
    },
  };
}

// ─── Module singleton ────────────────────────────────────────────────────────

let singleton: PageTextCache | undefined;

export function getPageTextCache(): PageTextCache {
  if (!singleton) singleton = createPageTextCache();
  return singleton;
}
