/**
 * Search diagnostics attached to an issue report.
 *
 * PRIVACY CONTRACT for this payload:
 * - PDF bytes are NEVER sent. There is no file upload path.
 * - Metadata (filename, size, page count, SHA-256, page/OCR counts, producer)
 *   is sent by default. This matches what `pdf_meta` telemetry already stores.
 * - `textSample` — the only field carrying real document *content* — is opt-in
 *   per report, default off, and the exact payload is shown to the visitor
 *   before they send it.
 *
 * Pure module (no Next/React imports) so it is unit-testable under `node --test`.
 */

import { z } from "zod";

/** Max characters of extracted text per file. */
export const MAX_DIAG_SAMPLE = 500;
/** Max files described in one report. */
export const MAX_DIAG_FILES = 5;
/** Mirrors MAX_QUERY_LEN in analytics/events. */
export const MAX_DIAG_QUERY = 120;

export const diagFileSchema = z.object({
  name: z.string().max(200),
  sizeBytes: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative(),
  sha256: z.string().length(64).optional(),
  /** Pages with a usable embedded text layer. */
  pagesWithText: z.number().int().nonnegative(),
  textLayer: z.enum(["text", "scanned", "mixed"]).optional(),
  ocrPages: z.number().int().nonnegative().optional(),
  ocrConfidence: z.number().min(0).max(100).optional(),
  ocrSkipped: z.string().max(40).optional(),
  producer: z.string().max(120).optional(),
  matches: z.number().int().nonnegative(),
  error: z.string().max(200).optional(),
  /** Opt-in excerpt — reveals a garbled or mis-encoded text layer. */
  textSample: z.string().max(MAX_DIAG_SAMPLE).optional(),
});

export const diagnosticsSchema = z.object({
  query: z.string().max(MAX_DIAG_QUERY),
  caseSensitive: z.boolean(),
  wholeWord: z.boolean(),
  totalMatches: z.number().int().nonnegative(),
  files: z.array(diagFileSchema).max(MAX_DIAG_FILES),
  /** True when the visitor consented to include text excerpts. */
  includedTextSample: z.boolean(),
  /** Client-side context that shapes OCR availability. */
  deviceMemory: z.number().optional(),
  isMobile: z.boolean().optional(),
  viewport: z.string().max(20).optional(),
});

export type DiagnosticsFile = z.infer<typeof diagFileSchema>;
export type Diagnostics = z.infer<typeof diagnosticsSchema>;

/** Minimal shape needed from a SearchResult — keeps this module dependency-free. */
export interface DiagSourceResult {
  fileName: string;
  totalPages: number;
  matches: unknown[];
  textLayer?: "text" | "scanned" | "mixed";
  textlessPages?: number[];
  ocrPages?: number[];
  ocrConfidence?: number;
  ocrSkipped?: string;
  error?: string;
  /** Byte size, when known from the file list. */
  sizeBytes?: number;
  sha256?: string;
  producer?: string;
  /** First page of extracted text, for the opt-in excerpt. */
  sampleText?: string;
}

/**
 * Truncates an excerpt to the cap, collapsing whitespace.
 *
 * Whitespace collapse matters for diagnosis, not just size: a text layer that
 * extracts as "T h e   i n v o i c e" is a real and common defect, and it must
 * survive into the sample rather than being normalized away — so single spaces
 * between letters are preserved and only runs of 2+ are collapsed.
 */
export function buildTextSample(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const cleaned = text.replace(/[ \t]{2,}/g, " ").replace(/\n{2,}/g, "\n").trim();
  if (!cleaned) return undefined;
  return cleaned.length > MAX_DIAG_SAMPLE
    ? cleaned.slice(0, MAX_DIAG_SAMPLE)
    : cleaned;
}

export interface BuildDiagnosticsInput {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  totalMatches: number;
  results: DiagSourceResult[];
  /** Visitor consented to include text excerpts. */
  includeTextSample: boolean;
  deviceMemory?: number;
  isMobile?: boolean;
  viewport?: string;
}

/**
 * Assembles the diagnostics payload.
 *
 * Files are ordered to put the useful ones first — errors, then scanned, then
 * zero-match — because the cap of 5 should keep whatever explains the problem,
 * not the first five alphabetically.
 */
export function buildDiagnostics(input: BuildDiagnosticsInput): Diagnostics {
  const ranked = [...input.results].sort(
    (a, b) => diagnosticRank(b) - diagnosticRank(a)
  );

  const files: DiagnosticsFile[] = ranked
    .slice(0, MAX_DIAG_FILES)
    .map((r) => {
      const textless = r.textlessPages?.length ?? 0;
      const file: DiagnosticsFile = {
        name: r.fileName.slice(0, 200),
        sizeBytes: Math.max(0, Math.round(r.sizeBytes ?? 0)),
        pageCount: r.totalPages,
        pagesWithText: Math.max(0, r.totalPages - textless),
        matches: r.matches.length,
      };
      if (r.sha256 && r.sha256.length === 64) file.sha256 = r.sha256;
      if (r.textLayer) file.textLayer = r.textLayer;
      if (r.ocrPages?.length) file.ocrPages = r.ocrPages.length;
      if (typeof r.ocrConfidence === "number") {
        file.ocrConfidence = Math.round(r.ocrConfidence);
      }
      if (r.ocrSkipped) file.ocrSkipped = r.ocrSkipped.slice(0, 40);
      if (r.producer) file.producer = r.producer.slice(0, 120);
      if (r.error) file.error = r.error.slice(0, 200);
      if (input.includeTextSample) {
        const sample = buildTextSample(r.sampleText);
        if (sample) file.textSample = sample;
      }
      return file;
    });

  return {
    query: input.query.slice(0, MAX_DIAG_QUERY),
    caseSensitive: input.caseSensitive,
    wholeWord: input.wholeWord,
    totalMatches: input.totalMatches,
    files,
    includedTextSample: input.includeTextSample,
    deviceMemory: input.deviceMemory,
    isMobile: input.isMobile,
    viewport: input.viewport?.slice(0, 20),
  };
}

/** Higher rank = more likely to explain the visitor's problem. */
function diagnosticRank(r: DiagSourceResult): number {
  if (r.error) return 4;
  if (r.ocrSkipped) return 3;
  if (r.textLayer && r.textLayer !== "text") return 2;
  if (r.matches.length === 0) return 1;
  return 0;
}

/** Human-readable rendering — shown to the visitor and emailed verbatim. */
export function formatDiagnostics(d: Diagnostics): string {
  const lines: string[] = [
    `query: ${JSON.stringify(d.query)}`,
    `options: caseSensitive=${d.caseSensitive} wholeWord=${d.wholeWord}`,
    `total matches: ${d.totalMatches}`,
  ];
  if (d.deviceMemory !== undefined) lines.push(`device memory: ${d.deviceMemory}GB`);
  if (d.isMobile !== undefined) lines.push(`mobile: ${d.isMobile}`);
  if (d.viewport) lines.push(`viewport: ${d.viewport}`);

  for (const f of d.files) {
    lines.push("");
    lines.push(`file: ${f.name}`);
    lines.push(
      `  ${formatBytesShort(f.sizeBytes)} · ${f.pageCount} pages · ` +
        `${f.pagesWithText}/${f.pageCount} pages with text · ${f.matches} matches`
    );
    if (f.textLayer) lines.push(`  text layer: ${f.textLayer}`);
    if (f.ocrPages !== undefined) {
      lines.push(
        `  ocr: ${f.ocrPages} pages` +
          (f.ocrConfidence !== undefined ? ` @ ${f.ocrConfidence}% confidence` : "")
      );
    }
    if (f.ocrSkipped) lines.push(`  ocr skipped: ${f.ocrSkipped}`);
    if (f.producer) lines.push(`  producer: ${f.producer}`);
    if (f.sha256) lines.push(`  sha256: ${f.sha256}`);
    if (f.error) lines.push(`  error: ${f.error}`);
    if (f.textSample) lines.push(`  text sample: ${JSON.stringify(f.textSample)}`);
  }
  if (!d.includedTextSample) {
    lines.push("");
    lines.push("(text excerpts not included)");
  }
  return lines.join("\n");
}

function formatBytesShort(bytes: number): string {
  if (bytes <= 0) return "unknown size";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
}
