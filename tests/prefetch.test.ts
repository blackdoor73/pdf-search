import { test } from "node:test";
import assert from "node:assert/strict";
import { createPrefetchController } from "../src/lib/pdf/prefetch.ts";
import type { CachedDoc } from "../src/lib/pdf/textCache.ts";
import type { PdfFile } from "../src/types/index.ts";

// In Node there is no requestIdleCallback, so prefetch.ts falls back to
// setTimeout(fn, 200). Tests must wait longer than 200ms for each processing
// step. This helper waits enough for the idle tick + extraction to finish.
const IDLE_MS = 250;
function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function makeFile(id: string, name = "test.pdf"): PdfFile {
  return {
    id,
    name,
    type: "file",
    source: new File(["%PDF-1.4 fake"], name, { type: "application/pdf" }),
    size: "1KB",
    byteSize: 100,
    status: "ready",
  };
}

function makeDoc(complete = true): CachedDoc {
  return {
    pages: [{ pageNum: 1, lines: ["hello"], textChars: 5 }],
    verdict: "text",
    textlessPages: [],
    ocrPages: [],
    complete,
    bytes: 10,
    storedAt: Date.now(),
  };
}

function noop() {}

/** Fake extract that records calls and resolves after a tick. */
function fakeExtract(log: string[]) {
  return async (file: PdfFile, signal: AbortSignal) => {
    log.push(`start:${file.id}`);
    await wait(5);
    if (signal.aborted) {
      log.push(`abort:${file.id}`);
      return;
    }
    log.push(`done:${file.id}`);
  };
}

// ─── enqueue ────────────────────────────────────────────────────────────────

test("enqueue skips files that already have a complete cache entry", () => {
  const cache = new Map<string, CachedDoc>();
  const file = makeFile("f1");
  cache.set("f1", makeDoc(true));

  const log: string[] = [];
  const ctrl = createPrefetchController({
    getCache: (f) => cache.get(f.id),
    setCache: noop,
    extractFile: fakeExtract(log),
  });

  ctrl.enqueue([file]);
  ctrl.yieldToSearch();
  assert.equal(log.length, 0, "should not start extraction for cached file");
});

test("enqueue skips URL files", () => {
  const log: string[] = [];
  const ctrl = createPrefetchController({
    getCache: () => undefined,
    setCache: noop,
    extractFile: fakeExtract(log),
  });

  const urlFile: PdfFile = {
    id: "u1",
    name: "doc.pdf",
    type: "url",
    source: "https://example.com/doc.pdf",
    size: "1KB",
    byteSize: 100,
    status: "ready",
  };

  ctrl.enqueue([urlFile]);
  ctrl.yieldToSearch();
  assert.equal(log.length, 0, "URL files should not be prefetched");
});

test("enqueue deduplicates by file id", async () => {
  const log: string[] = [];
  const ctrl = createPrefetchController({
    getCache: () => undefined,
    setCache: noop,
    extractFile: fakeExtract(log),
  });

  const file = makeFile("f1");
  ctrl.enqueue([file, file, file]);

  await wait(IDLE_MS + 50);
  const starts = log.filter((l) => l.startsWith("start:"));
  assert.equal(starts.length, 1, "should only process the file once");
});

// ─── yieldToSearch / resume ─────────────────────────────────────────────────

test("yieldToSearch aborts in-flight extraction", async () => {
  const log: string[] = [];
  const ctrl = createPrefetchController({
    getCache: () => undefined,
    setCache: noop,
    extractFile: async (file, signal) => {
      log.push(`start:${file.id}`);
      // Simulate a long extraction
      await wait(500);
      if (signal.aborted) {
        log.push(`abort:${file.id}`);
        return;
      }
      log.push(`done:${file.id}`);
    },
  });

  ctrl.enqueue([makeFile("f1")]);
  // Wait for idle tick + extraction to start
  await wait(IDLE_MS + 50);
  assert.ok(log.includes("start:f1"), "extraction should have started");

  ctrl.yieldToSearch();
  await wait(600);
  assert.ok(log.includes("abort:f1"), "extraction should have been aborted");
  assert.ok(!log.includes("done:f1"), "extraction should not have completed");
});

test("resume restarts queue processing after yield", async () => {
  const log: string[] = [];
  const ctrl = createPrefetchController({
    getCache: () => undefined,
    setCache: noop,
    extractFile: fakeExtract(log),
  });

  ctrl.yieldToSearch();
  ctrl.enqueue([makeFile("f1")]);

  await wait(IDLE_MS + 50);
  assert.equal(log.length, 0, "should not process while paused");

  ctrl.resume();
  await wait(IDLE_MS + 50);
  assert.ok(log.includes("start:f1"), "should process after resume");
});

// ─── drop ───────────────────────────────────────────────────────────────────

test("drop removes a queued file before it starts", async () => {
  const log: string[] = [];
  const ctrl = createPrefetchController({
    getCache: () => undefined,
    setCache: noop,
    extractFile: fakeExtract(log),
  });

  ctrl.yieldToSearch(); // Pause
  ctrl.enqueue([makeFile("f1"), makeFile("f2"), makeFile("f3")]);
  ctrl.drop("f2");
  ctrl.resume();

  // Wait enough for all files to process (3 idle ticks)
  await wait((IDLE_MS + 50) * 3);
  assert.ok(!log.includes("start:f2"), "f2 should not have been processed");
  assert.ok(log.includes("start:f1"), "f1 should have been processed");
  assert.ok(log.includes("start:f3"), "f3 should have been processed");
});

// ─── reset ──────────────────────────────────────────────────────────────────

test("reset clears queue and allows fresh enqueues", async () => {
  const log: string[] = [];
  const ctrl = createPrefetchController({
    getCache: () => undefined,
    setCache: noop,
    extractFile: fakeExtract(log),
  });

  ctrl.yieldToSearch();
  ctrl.enqueue([makeFile("f1"), makeFile("f2")]);
  ctrl.reset();

  await wait(IDLE_MS + 50);
  assert.equal(log.length, 0, "nothing should process after reset");

  ctrl.enqueue([makeFile("f3")]);
  await wait(IDLE_MS + 50);
  assert.ok(log.includes("start:f3"), "new file should process after reset");
});
