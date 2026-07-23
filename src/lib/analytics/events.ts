/**
 * Shared telemetry event definitions.
 *
 * Used by both the client tracker (src/lib/analytics/client.ts) and the
 * ingestion endpoint (src/app/api/track/route.ts) so the two can never drift.
 *
 * PRIVACY CONTRACT — enforced here, at the type level:
 * - No PDF file content or bytes ever leave the client.
 * - PDF *metadata* IS collected (product decision, Analytics V2): filename,
 *   size, page count, SHA-256 content hash, and embedded document info
 *   (title/author/subject/keywords/creator/producer/dates) via `pdf_meta`
 *   events, stored in the pdf_documents table.
 * - The raw visitor IP is never stored; the server keeps only an
 *   HMAC-SHA256 hash (see src/lib/analytics/ipHash.ts) plus Vercel geo
 *   headers (country/region/city, coarse lat/lon).
 * - `aid` is the existing anonymous cookie ID (pdfsearch_session) — random
 *   UUID, never linked to identity.
 * - `sid` is a per-tab session ID used for session-level metrics.
 */

import { z } from "zod";

export const EVENT_NAMES = [
  "session_start",
  "page_view",
  "pdf_upload",
  "pdf_url_added",
  "pdf_load_error",
  "search",
  "search_error",
  "export_csv",
  "client_error",
  "web_vital",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export type EventProps = Record<string, string | number | boolean>;

export const trackedEventSchema = z.object({
  /** Client-generated UUID — the idempotency key. Retried beacons or
   *  fetches insert with ON CONFLICT DO NOTHING and cannot double-count. */
  id: z.string().uuid().optional(),
  e: z.enum(EVENT_NAMES),
  /** Client timestamp (ms epoch). Server clamps to a sane window. */
  ts: z.number().int().positive().optional(),
  props: z
    .record(z.union([z.string().max(256), z.number(), z.boolean()]))
    .default({}),
});

export const trackBatchSchema = z.object({
  aid: z.string().min(8).max(64),
  sid: z.string().min(8).max(64),
  page: z.string().max(256).optional(),
  ref: z.string().max(512).optional(),
  /** IANA timezone from Intl (better than the server's geo guess). */
  tz: z.string().max(64).optional(),
  /** BCP-47 language tag from navigator.language. */
  lang: z.string().max(32).optional(),
  events: z.array(trackedEventSchema).min(1).max(25),
});

export type TrackedEvent = z.infer<typeof trackedEventSchema>;
export type TrackBatch = z.infer<typeof trackBatchSchema>;

/** Max length stored for search query text. */
export const MAX_QUERY_LEN = 120;
