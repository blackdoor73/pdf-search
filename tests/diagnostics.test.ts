import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDiagnostics,
  buildTextSample,
  diagnosticsSchema,
  formatDiagnostics,
  MAX_DIAG_FILES,
  MAX_DIAG_SAMPLE,
  type DiagSourceResult,
} from "../src/lib/feedback/diagnostics.ts";

const result = (over: Partial<DiagSourceResult> = {}): DiagSourceResult => ({
  fileName: "statement.pdf",
  totalPages: 12,
  matches: [],
  sizeBytes: 2_400_000,
  ...over,
});

const base = {
  query: "invoice total",
  caseSensitive: false,
  wholeWord: false,
  totalMatches: 0,
  includeTextSample: false,
};

// ─── The privacy contract ─────────────────────────────────────────────────────

test("textSample is omitted unless the visitor opted in", () => {
  const withSample = result({ sampleText: "The invoice total is 48,215.00 USD." });

  const off = buildDiagnostics({ ...base, results: [withSample] });
  assert.equal(off.files[0].textSample, undefined);
  assert.equal(off.includedTextSample, false);

  const on = buildDiagnostics({
    ...base,
    results: [withSample],
    includeTextSample: true,
  });
  assert.match(on.files[0].textSample ?? "", /invoice total/);
  assert.equal(on.includedTextSample, true);
});

test("no field can carry PDF bytes", () => {
  // The schema is the enforcement point: every field is a bounded string or
  // number, so there is no channel through which file content could travel
  // beyond the capped textSample.
  const d = buildDiagnostics({
    ...base,
    results: [result({ sampleText: "x".repeat(5000) })],
    includeTextSample: true,
  });
  const parsed = diagnosticsSchema.safeParse(d);
  assert.equal(parsed.success, true);
  assert.ok((d.files[0].textSample ?? "").length <= MAX_DIAG_SAMPLE);
});

// ─── buildTextSample ──────────────────────────────────────────────────────────

test("buildTextSample caps at MAX_DIAG_SAMPLE", () => {
  const s = buildTextSample("a".repeat(MAX_DIAG_SAMPLE + 250));
  assert.equal(s?.length, MAX_DIAG_SAMPLE);
});

test("buildTextSample preserves single spaces so garbled layers stay visible", () => {
  // "T h e   i n v o i c e" is a real extraction defect. Collapsing all runs of
  // whitespace would hide exactly the bug we need to see, so only 2+ collapse.
  const s = buildTextSample("T h e  i n v o i c e");
  assert.equal(s, "T h e i n v o i c e");
  assert.match(s ?? "", /T h e/);
});

test("buildTextSample returns undefined for empty or whitespace-only input", () => {
  assert.equal(buildTextSample(undefined), undefined);
  assert.equal(buildTextSample(""), undefined);
  assert.equal(buildTextSample("   \n\n  "), undefined);
});

// ─── File cap and ranking ─────────────────────────────────────────────────────

test("caps the file list at MAX_DIAG_FILES", () => {
  const many = Array.from({ length: 12 }, (_, i) =>
    result({ fileName: `f${i}.pdf` })
  );
  const d = buildDiagnostics({ ...base, results: many });
  assert.equal(d.files.length, MAX_DIAG_FILES);
});

test("keeps the files that explain the problem, not the first five", () => {
  // The cap must not throw away the broken file just because eight healthy
  // files happened to sort ahead of it.
  const results = [
    ...Array.from({ length: 8 }, (_, i) =>
      result({ fileName: `ok${i}.pdf`, matches: [1, 2] })
    ),
    result({ fileName: "scanned.pdf", textLayer: "scanned", ocrSkipped: "mobile" }),
    result({ fileName: "broken.pdf", error: "Invalid PDF structure" }),
  ];
  const d = buildDiagnostics({ ...base, results });
  const names = d.files.map((f) => f.name);
  assert.ok(names.includes("broken.pdf"), `got ${names.join()}`);
  assert.ok(names.includes("scanned.pdf"), `got ${names.join()}`);
  // Most diagnostic first.
  assert.equal(names[0], "broken.pdf");
  assert.equal(names[1], "scanned.pdf");
});

// ─── Field mapping ────────────────────────────────────────────────────────────

test("pagesWithText is derived from the textless page list", () => {
  const d = buildDiagnostics({
    ...base,
    results: [result({ totalPages: 12, textlessPages: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] })],
  });
  assert.equal(d.files[0].pageCount, 12);
  assert.equal(d.files[0].pagesWithText, 0); // the scanned-PDF signature
});

test("carries the OCR outcome through", () => {
  const d = buildDiagnostics({
    ...base,
    results: [
      result({
        totalPages: 12,
        textlessPages: [1, 2, 3],
        ocrPages: [1, 2, 3],
        ocrConfidence: 94.7,
        textLayer: "mixed",
      }),
    ],
  });
  const f = d.files[0];
  assert.equal(f.textLayer, "mixed");
  assert.equal(f.ocrPages, 3);
  assert.equal(f.ocrConfidence, 95); // rounded
  assert.equal(f.pagesWithText, 9);
});

test("truncates over-long strings rather than failing validation", () => {
  const d = buildDiagnostics({
    ...base,
    query: "q".repeat(400),
    results: [
      result({
        fileName: "n".repeat(400),
        error: "e".repeat(400),
        producer: "p".repeat(400),
      }),
    ],
  });
  assert.equal(diagnosticsSchema.safeParse(d).success, true);
});

test("an invalid sha256 is dropped rather than sent", () => {
  const d = buildDiagnostics({ ...base, results: [result({ sha256: "tooshort" })] });
  assert.equal(d.files[0].sha256, undefined);
  assert.equal(diagnosticsSchema.safeParse(d).success, true);

  const good = "a".repeat(64);
  const d2 = buildDiagnostics({ ...base, results: [result({ sha256: good })] });
  assert.equal(d2.files[0].sha256, good);
});

// ─── Payload size ─────────────────────────────────────────────────────────────

test("a worst-case payload stays well under the 64KB body cap", () => {
  const results = Array.from({ length: MAX_DIAG_FILES }, (_, i) =>
    result({
      fileName: "f".repeat(200) + i,
      sampleText: "s".repeat(MAX_DIAG_SAMPLE * 2),
      error: "e".repeat(200),
      producer: "p".repeat(120),
      sha256: "a".repeat(64),
      textLayer: "scanned",
      ocrSkipped: "low-memory",
    })
  );
  const d = buildDiagnostics({
    ...base,
    query: "q".repeat(120),
    results,
    includeTextSample: true,
  });
  const bytes = new TextEncoder().encode(
    JSON.stringify({ category: "issue", message: "m".repeat(2000), diagnostics: d })
  ).length;
  assert.ok(bytes < 64 * 1024, `payload was ${bytes} bytes`);
});

// ─── Rendering ────────────────────────────────────────────────────────────────

test("formatDiagnostics surfaces the scanned-PDF signature", () => {
  const d = buildDiagnostics({
    ...base,
    results: [
      result({
        fileName: "statement_q3.pdf",
        totalPages: 12,
        textlessPages: Array.from({ length: 12 }, (_, i) => i + 1),
        ocrSkipped: "mobile",
        textLayer: "scanned",
      }),
    ],
  });
  const out = formatDiagnostics(d);
  assert.match(out, /statement_q3\.pdf/);
  assert.match(out, /0\/12 pages with text/);
  assert.match(out, /text layer: scanned/);
  assert.match(out, /ocr skipped: mobile/);
  assert.match(out, /query: "invoice total"/);
});

test("formatDiagnostics states plainly when excerpts were withheld", () => {
  const d = buildDiagnostics({ ...base, results: [result()] });
  assert.match(formatDiagnostics(d), /text excerpts not included/);
});
