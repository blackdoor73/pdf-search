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
  // Per-document metadata (routed to the pdf_documents table at ingestion).
  // Props: filename, sizeBytes, pageCount, sha256, title, author, subject,
  // keywords, creator, producer, created, modified, source, status, processingMs.
  "pdf_meta",
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

/**
 * Envelope-only schema: the batch metadata must be valid, but individual
 * events are validated one-by-one by parseBatchLenient below.
 */
const trackBatchEnvelopeSchema = trackBatchSchema.extend({
  events: z.array(z.unknown()).min(1).max(25),
});

export interface LenientParseResult {
  batch: TrackBatch;
  /** Events rejected by per-event validation (batch still ingests the rest). */
  dropped: { index: number; reason: string }[];
}

/**
 * Parse an ingestion payload, salvaging every valid event.
 *
 * The batch used to be validated all-or-nothing, so one malformed event —
 * an over-long PDF metadata string, an id that isn't a UUID — silently
 * discarded every other event flushed in the same window (page_view,
 * search, pdf_meta, all of it). Now the envelope must be valid, and each
 * event stands or falls on its own.
 *
 * Returns null only when the envelope itself is unusable.
 */
export function parseBatchLenient(input: unknown): LenientParseResult | null {
  const envelope = trackBatchEnvelopeSchema.safeParse(input);
  if (!envelope.success) return null;

  const events: TrackedEvent[] = [];
  const dropped: { index: number; reason: string }[] = [];

  envelope.data.events.forEach((raw, index) => {
    const parsed = trackedEventSchema.safeParse(raw);
    if (parsed.success) {
      events.push(parsed.data);
    } else {
      dropped.push({
        index,
        reason: parsed.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join("; "),
      });
    }
  });

  if (events.length === 0) return null;
  return { batch: { ...envelope.data, events }, dropped };
}

/** Max length stored for search query text. */
export const MAX_QUERY_LEN = 120;
