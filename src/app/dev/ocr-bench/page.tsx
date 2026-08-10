"use client";

/**
 * OCR benchmark — dev only, returns 404 in production.
 *
 * Exists because the "~1.5s/page" figure in ocrLimits.ts was hand-measured once
 * and never reproducible, and because there is no per-stage breakdown anywhere.
 * Optimizing without this would be guesswork: if recognition dominates, then
 * pipelining and a cheaper codec are both nearly worthless, and that is only
 * knowable by measuring.
 *
 * Runs the REAL searchAllPdfs against synthetic fixtures, so what it measures is
 * the shipping code path, not a mock of it.
 */

import { useCallback, useState } from "react";
import { notFound } from "next/navigation";
import { searchAllPdfs } from "@/lib/pdf/engine";
import { makeScannedPdf, makeTextPdf } from "@/lib/pdf/devFixtures";
import { computeConcurrency } from "@/lib/upload/limits";
import { createPageTextCache, cacheKeyFor, estimateDocBytes } from "@/lib/pdf/textCache";
import type { PdfFile, SearchResult } from "@/types";

interface Scenario {
  name: string;
  note: string;
  build: () => Promise<File[]>;
}

/** The four cases from the performance plan's verification section. */
const SCENARIOS: Scenario[] = [
  {
    name: "A · 20 files, 2 × 10-page scans",
    note: "The reported case. Shows the chunk-barrier stall.",
    build: async () => [
      ...(await Promise.all(Array.from({ length: 18 }, () => makeTextPdf(3)))),
      await makeScannedPdf(10),
      await makeScannedPdf(10),
    ],
  },
  {
    name: "B · 5 files, all scanned, 6 pages each",
    note: "Shows what a tesseract worker pool would buy.",
    build: async () =>
      Promise.all(Array.from({ length: 5 }, () => makeScannedPdf(6))),
  },
  {
    name: "C · 1 file, 12-page scan",
    note: "Isolates per-page cost from any scheduling effect.",
    build: async () => [await makeScannedPdf(12)],
  },
  {
    name: "D · 20 text-layer files (control)",
    note: "MUST stay fast. Regression guard for the non-OCR path.",
    build: async () => Promise.all(Array.from({ length: 20 }, () => makeTextPdf(3))),
  },
  {
    name: "E · D repeated (warm cache)",
    note: "Second search with text cache. Should be ≪100ms.",
    build: async () => Promise.all(Array.from({ length: 20 }, () => makeTextPdf(3))),
  },
];

interface Row {
  scenario: string;
  note: string;
  wallMs: number;
  files: number;
  ocrFiles: number;
  ocrPages: number;
  queueWaitMs: number;
  renderMs: number;
  encodeMs: number;
  recognizeMs: number;
  warmMs: number;
  kbPerPage: number;
  peak: number;
  workers: number;
  matches: number;
  confidence: number;
}

export default function OcrBenchPage() {
  // Never expose a benchmark harness in production.
  if (process.env.NODE_ENV === "production") notFound();

  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const say = (s: string) => setLog((p) => [...p, s]);

  const runScenario = useCallback(async (s: Scenario) => {
    setRunning(s.name);
    say(`building fixtures for ${s.name}…`);
    const built = await s.build();
    const files: PdfFile[] = built.map((f, i) => ({
      id: `bench-${i}-${f.name}`,
      name: f.name,
      type: "file",
      source: f,
      size: `${Math.round(f.size / 1024)}KB`,
      byteSize: f.size,
      status: "ready",
    }));
    const totalBytes = files.reduce((n, f) => n + f.byteSize, 0);
    const isRepeat = s.name.includes("warm cache");
    say(
      `running: ${files.length} files, ${(totalBytes / 1024 / 1024).toFixed(1)}MB, ` +
        `concurrency=${computeConcurrency(totalBytes, files.length)}` +
        (isRepeat ? " (cache warm-up + measured run)" : "")
    );

    const cache = createPageTextCache();
    const textCache = {
      get: (f: PdfFile) => cache.get(cacheKeyFor(f)),
      set: (f: PdfFile, d: Parameters<typeof cache.set>[1]) => cache.set(cacheKeyFor(f), d),
    };
    const searchOpts = {
      caseSensitive: false,
      wholeWord: false,
      showContext: true,
      concurrency: computeConcurrency(totalBytes, files.length),
      ocr: true,
      textCache,
    };

    if (isRepeat) {
      say("  warm-up pass…");
      await searchAllPdfs(files, "invoice", searchOpts);
      say(`  cache size: ${Math.round(cache.size() / 1024)}KB`);
    }

    const t0 = performance.now();
    const results: SearchResult[] = await searchAllPdfs(files, "invoice", searchOpts);
    const wallMs = Math.round(performance.now() - t0);

    const ocr = results.filter((r) => r.ocrPages?.length);
    const sum = (pick: (r: SearchResult) => number) =>
      ocr.reduce((n, r) => n + pick(r), 0);
    const pages = sum((r) => r.ocrPages?.length ?? 0);

    setRows((p) => [
      ...p,
      {
        scenario: s.name,
        note: s.note,
        wallMs,
        files: results.length,
        ocrFiles: ocr.length,
        ocrPages: pages,
        queueWaitMs: sum((r) => r.ocrPerf?.queueWaitMs ?? 0),
        renderMs: sum((r) => r.ocrPerf?.renderMs ?? 0),
        encodeMs: sum((r) => r.ocrPerf?.encodeMs ?? 0),
        recognizeMs: sum((r) => r.ocrPerf?.recognizeMs ?? 0),
        warmMs: sum((r) => r.ocrPerf?.warmMs ?? 0),
        peak: Math.max(0, ...ocr.map((r) => r.ocrPerf?.peakRecognizing ?? 0)),
        workers: Math.max(0, ...ocr.map((r) => r.ocrPerf?.poolWorkers ?? 0)),
        kbPerPage: ocr.length
          ? Math.round(sum((r) => r.ocrPerf?.bytesPerPage ?? 0) / ocr.length / 1024)
          : 0,
        matches: results.reduce((n, r) => n + r.matches.length, 0),
        confidence: ocr.length
          ? Math.round(sum((r) => r.ocrConfidence ?? 0) / ocr.length)
          : 0,
      },
    ]);
    say(`${s.name} → ${wallMs}ms wall, ${pages} pages OCR'd`);
    setRunning(null);
  }, []);

  const runAll = useCallback(async () => {
    setRows([]);
    setLog([]);
    for (const s of SCENARIOS) await runScenario(s);
  }, [runScenario]);

  const cell = "px-2 py-1 border-b border-[var(--border)] text-right tabular-nums";

  return (
    <main className="max-w-6xl mx-auto p-8 space-y-6 font-mono text-xs">
      <div>
        <h1 className="text-lg font-semibold text-[var(--text)]">OCR benchmark</h1>
        <p className="text-[var(--text-3)] mt-1">
          Runs the real <code>searchAllPdfs</code> over synthetic fixtures. Per-stage
          figures are summed across every OCR&apos;d file in the scenario. Run twice —
          the first run pays a one-time engine warm-up and asset download.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runAll}
          disabled={running !== null}
          className="btn-primary px-3 py-2 font-semibold disabled:opacity-60"
        >
          {running ? `Running ${running}…` : "Run all scenarios"}
        </button>
        {SCENARIOS.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => runScenario(s)}
            disabled={running !== null}
            className="btn-ghost px-3 py-2 disabled:opacity-60"
          >
            {s.name.split(" · ")[0]}
          </button>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-[var(--text-3)]">
                <th className="px-2 py-1 border-b border-[var(--border)]">scenario</th>
                <th className={cell}>wall</th>
                <th className={cell}>files</th>
                <th className={cell}>ocr files</th>
                <th className={cell}>pages</th>
                <th className={cell}>queue</th>
                <th className={cell}>warm</th>
                <th className={cell}>render</th>
                <th className={cell}>encode</th>
                <th className={cell}>recognize</th>
                <th className={cell}>peak</th>
                <th className={cell}>wrkrs</th>
                <th className={cell}>KB/pg</th>
                <th className={cell}>conf</th>
                <th className={cell}>matches</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.scenario}-${i}`} className="text-[var(--text-2)]">
                  <td className="px-2 py-1 border-b border-[var(--border)]">
                    {r.scenario}
                    <span className="block text-[10px] text-[var(--text-3)]">{r.note}</span>
                  </td>
                  <td className={`${cell} text-[var(--accent)] font-semibold`}>{r.wallMs}</td>
                  <td className={cell}>{r.files}</td>
                  <td className={cell}>{r.ocrFiles}</td>
                  <td className={cell}>{r.ocrPages}</td>
                  <td className={cell}>{r.queueWaitMs}</td>
                  <td className={cell}>{r.warmMs}</td>
                  <td className={cell}>{r.renderMs}</td>
                  <td className={cell}>{r.encodeMs}</td>
                  <td className={cell}>{r.recognizeMs}</td>
                  <td className={`${cell} text-[var(--accent)]`}>{r.peak}</td>
                  <td className={cell}>{r.workers}</td>
                  <td className={cell}>{r.kbPerPage}</td>
                  <td className={cell}>{r.confidence}</td>
                  <td className={cell}>{r.matches}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-[var(--text-3)] mt-2">
            All times in ms. render/encode/recognize are summed per-page costs, so with
            serial OCR they should roughly account for wall time minus queue wait.
          </p>
        </div>
      )}

      {log.length > 0 && (
        <pre className="bg-[var(--surface2)] p-3 text-[10px] whitespace-pre-wrap text-[var(--text-3)]">
          {log.join("\n")}
        </pre>
      )}
    </main>
  );
}
