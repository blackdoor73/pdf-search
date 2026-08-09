/**
 * Pure, DB-free helpers for the admin query layer: param clamps, CSV
 * serialization, and the documents-listing SQL assembly. Kept free of
 * path-alias imports so node --test can load them directly
 * (tests/adminQueries.test.ts) — hence the relative import below.
 */

// Explicit .ts extension: Node's ESM resolver runs this file directly under
// `node --test` and will not infer it.
import { FEEDBACK_CATEGORIES } from "../feedback/schema.ts";

export function clampDays(raw: string | null, fallback = 30): number {
  // Number(null) is 0, which would silently clamp a missing param to 1 day —
  // treat absent/empty as "use the fallback".
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(180, Math.max(1, Math.floor(n)));
}

export function clampPage(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(10_000, Math.floor(n));
}

export function clampPageSize(raw: string | null, fallback = 25): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(100, Math.floor(n));
}

export function toCsv(
  headers: string[],
  rows: (string | number | null)[][]
): string {
  const esc = (v: string | number | null) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

// ─── Documents listing SQL ────────────────────────────────────────────────────

export interface DocumentFilters {
  q?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD (inclusive)
  minPages?: number;
  maxPages?: number;
  minBytes?: number;
  maxBytes?: number;
  status?: "ok" | "error";
  source?: "file" | "url";
  dupesOnly?: boolean;
  sort?: "ts" | "size_bytes" | "page_count";
  dir?: "asc" | "desc";
  page: number;
  pageSize: number;
}

const DOC_SORT_COLUMNS = new Set(["ts", "size_bytes", "page_count"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Pure WHERE/ORDER/LIMIT assembly for the documents listing — testable
 * without a database. All values are parameterized; sort column/direction
 * are whitelist-validated.
 */
export function buildDocumentsQuery(f: DocumentFilters): {
  text: string;
  countText: string;
  params: unknown[];
} {
  const clauses: string[] = ["TRUE"];
  const params: unknown[] = [];
  const add = (clause: (n: number) => string, value: unknown) => {
    params.push(value);
    clauses.push(clause(params.length));
  };

  if (f.q) add((n) => `filename ILIKE '%' || $${n} || '%'`, f.q.slice(0, 100));
  if (f.from && DATE_RE.test(f.from)) add((n) => `ts >= $${n}::date`, f.from);
  if (f.to && DATE_RE.test(f.to))
    add((n) => `ts < $${n}::date + interval '1 day'`, f.to);
  if (f.minPages != null) add((n) => `page_count >= $${n}`, f.minPages);
  if (f.maxPages != null) add((n) => `page_count <= $${n}`, f.maxPages);
  if (f.minBytes != null) add((n) => `size_bytes >= $${n}`, f.minBytes);
  if (f.maxBytes != null) add((n) => `size_bytes <= $${n}`, f.maxBytes);
  if (f.status === "ok" || f.status === "error")
    add((n) => `status = $${n}`, f.status);
  if (f.source === "file" || f.source === "url")
    add((n) => `source = $${n}`, f.source);
  if (f.dupesOnly) {
    clauses.push(
      `sha256 IN (SELECT sha256 FROM pdf_documents
                  WHERE coalesce(sha256, '') <> ''
                  GROUP BY sha256 HAVING count(*) > 1)`
    );
  }

  const where = clauses.join(" AND ");
  const sort = DOC_SORT_COLUMNS.has(f.sort ?? "") ? f.sort : "ts";
  const dir = f.dir === "asc" ? "ASC" : "DESC";
  const limit = `$${params.length + 1}`;
  const offset = `$${params.length + 2}`;

  return {
    text: `SELECT id, to_char(ts, 'YYYY-MM-DD HH24:MI') AS at, filename,
             size_bytes, page_count, sha256, title, author, subject, keywords,
             creator, producer, pdf_created, pdf_modified, source, status,
             processing_ms, country, city, anon_id,
             CASE WHEN coalesce(sha256, '') = '' THEN 1
                  ELSE count(*) OVER (PARTITION BY sha256) END AS duplicates
           FROM pdf_documents
           WHERE ${where}
           ORDER BY ${sort} ${dir} NULLS LAST, id DESC
           LIMIT ${limit} OFFSET ${offset}`,
    countText: `SELECT count(*) AS total FROM pdf_documents WHERE ${where}`,
    params,
  };
}

// ─── Feedback listing SQL ─────────────────────────────────────────────────────

export interface FeedbackFilters {
  q?: string;
  category?: string;
  status?: "new" | "resolved";
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD (inclusive)
  page: number;
  pageSize: number;
}

// Derived from the shared schema rather than re-listed: a hardcoded copy here
// silently dropped any new category from the admin filter (it was missing
// "issue" the moment that category was added).
const FEEDBACK_CATEGORY_SET: ReadonlySet<string> = new Set(FEEDBACK_CATEGORIES);

/**
 * Pure WHERE/ORDER/LIMIT assembly for the feedback listing — testable
 * without a database. All values parameterized; category/status validated
 * against whitelists.
 */
export function buildFeedbackQuery(f: FeedbackFilters): {
  text: string;
  countText: string;
  params: unknown[];
} {
  const clauses: string[] = ["TRUE"];
  const params: unknown[] = [];
  const add = (clause: (n: number) => string, value: unknown) => {
    params.push(value);
    clauses.push(clause(params.length));
  };

  if (f.q) add((n) => `message ILIKE '%' || $${n} || '%'`, f.q.slice(0, 200));
  if (f.category && FEEDBACK_CATEGORY_SET.has(f.category))
    add((n) => `category = $${n}`, f.category);
  if (f.status === "new" || f.status === "resolved")
    add((n) => `status = $${n}`, f.status);
  if (f.from && DATE_RE.test(f.from)) add((n) => `ts >= $${n}::date`, f.from);
  if (f.to && DATE_RE.test(f.to))
    add((n) => `ts < $${n}::date + interval '1 day'`, f.to);

  const where = clauses.join(" AND ");
  const limit = `$${params.length + 1}`;
  const offset = `$${params.length + 2}`;

  return {
    text: `SELECT id, to_char(ts, 'YYYY-MM-DD HH24:MI') AS at, category, message,
             email, page, country, browser, os, device, status, admin_note, diagnostics
           FROM feedback
           WHERE ${where}
           ORDER BY ts DESC, id DESC
           LIMIT ${limit} OFFSET ${offset}`,
    countText: `SELECT count(*) AS total,
                  count(*) FILTER (WHERE status = 'new') AS new_count
                FROM feedback WHERE ${where}`,
    params,
  };
}
