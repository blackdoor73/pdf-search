import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pageIsTextless,
  classifyTextLayer,
  decideOcr,
  computeRenderScale,
  ocrSkipMessage,
  ocrTruncatedNote,
  refundBudget,
  PAGE_TEXT_CHAR_MIN,
  OCR_MAX_PAGES,
  OCR_MAX_PAGES_PER_SEARCH,
  OCR_SILENT_PAGE_MAX,
  OCR_TARGET_DPI,
  OCR_MAX_PIXELS,
} from "../src/lib/pdf/ocrLimits.ts";
import { enqueueOcr, resetOcrQueue } from "../src/lib/pdf/ocrQueue.ts";

// ─── pageIsTextless ───────────────────────────────────────────────────────────

test("pageIsTextless: boundary sits exactly at PAGE_TEXT_CHAR_MIN", () => {
  assert.equal(PAGE_TEXT_CHAR_MIN, 24);
  assert.equal(pageIsTextless(23), true);
  assert.equal(pageIsTextless(24), false);
  assert.equal(pageIsTextless(25), false);
  assert.equal(pageIsTextless(0), true);
});

test("pageIsTextless: real scanner artifacts count as textless", () => {
  // Non-whitespace lengths of stamps seen on genuinely scanned pages. If any
  // of these is judged "has text", the visitor silently gets zero results.
  const artifacts = {
    "Scanned by CamScanner": 20,
    "Page 1 of 40": 9,
    "ABC-0001234": 11,
    "03/14/2019": 10,
    "1": 1,
  };
  for (const [label, chars] of Object.entries(artifacts)) {
    assert.equal(pageIsTextless(chars), true, `${label} (${chars} chars)`);
  }
});

test("pageIsTextless: the thinnest legitimate text page is kept", () => {
  // "Chapter Four — Consequences" = 25 non-whitespace chars.
  assert.equal(pageIsTextless(25), false);
});

// ─── classifyTextLayer ────────────────────────────────────────────────────────

test("classifyTextLayer: no pages and no textless pages are both 'text'", () => {
  assert.equal(classifyTextLayer({ totalPages: 0, textlessPages: 0 }), "text");
  assert.equal(classifyTextLayer({ totalPages: 10, textlessPages: 0 }), "text");
  // Defensive: a negative page count must not become "scanned".
  assert.equal(classifyTextLayer({ totalPages: -1, textlessPages: 3 }), "text");
});

test("classifyTextLayer: born-digital report with scanned exhibits is 'mixed'", () => {
  // 200-page report, 30 scanned exhibits appended = 15% textless. Must NOT
  // trigger a big OCR run when the text layer already answers the query.
  assert.equal(
    classifyTextLayer({ totalPages: 200, textlessPages: 30 }),
    "mixed"
  );
});

test("classifyTextLayer: scanned filing with a digital cover is 'scanned'", () => {
  // 40-page filing: 4-page digital cover + TOC, 36 scanned = 90% textless.
  assert.equal(
    classifyTextLayer({ totalPages: 40, textlessPages: 36 }),
    "scanned"
  );
});

test("classifyTextLayer: the 0.6 ratio boundary", () => {
  assert.equal(classifyTextLayer({ totalPages: 10, textlessPages: 6 }), "scanned");
  assert.equal(classifyTextLayer({ totalPages: 10, textlessPages: 5 }), "mixed");
});

test("classifyTextLayer: short docs are judged all-or-nothing", () => {
  // Under RATIO_MIN_PAGES the ratio is too noisy — 1 of 2 pages textless is a
  // cover sheet, not a scan.
  assert.equal(classifyTextLayer({ totalPages: 1, textlessPages: 1 }), "scanned");
  assert.equal(classifyTextLayer({ totalPages: 2, textlessPages: 2 }), "scanned");
  assert.equal(classifyTextLayer({ totalPages: 2, textlessPages: 1 }), "mixed");
});

test("classifyTextLayer: fully scanned documents of any length", () => {
  assert.equal(classifyTextLayer({ totalPages: 40, textlessPages: 40 }), "scanned");
  assert.equal(classifyTextLayer({ totalPages: 300, textlessPages: 300 }), "scanned");
});

// ─── decideOcr ────────────────────────────────────────────────────────────────

const textless = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

test("decideOcr: nothing to do when there is a text layer", () => {
  assert.deepEqual(decideOcr("text", []), { run: false, reason: "no-need" });
  assert.deepEqual(decideOcr("text", [1, 2]), { run: false, reason: "no-need" });
  assert.deepEqual(decideOcr("scanned", []), { run: false, reason: "no-need" });
});

test("decideOcr: mobile is blocked regardless of reported RAM", () => {
  // Mirrors uploadLimits' stance — a phone with 8GB is still a phone.
  assert.deepEqual(decideOcr("scanned", textless(3), { isMobile: true }), {
    run: false,
    reason: "mobile",
  });
  assert.deepEqual(
    decideOcr("scanned", textless(3), {
      isMobile: true,
      deviceMemory: 8,
      hardwareConcurrency: 8,
    }),
    { run: false, reason: "mobile" }
  );
});

test("decideOcr: low-memory desktops are blocked", () => {
  assert.deepEqual(decideOcr("scanned", textless(3), { deviceMemory: 3 }), {
    run: false,
    reason: "low-memory",
  });
  assert.deepEqual(decideOcr("scanned", textless(3), { deviceMemory: 1 }), {
    run: false,
    reason: "low-memory",
  });
});

test("decideOcr: unknown capability RUNS — the deliberate inversion", () => {
  // This is the documentation for a real design decision. computeFileLimit()
  // falls back conservatively when deviceMemory is absent, because guessing
  // high there can kill a tab. Here the same unknown must guess the other way:
  // Safari and Firefox report nothing, and blocking them would make OCR a
  // Chrome-only feature — which defeats the point of building it.
  const safari = decideOcr("scanned", textless(3), {});
  assert.equal(safari.run, true);

  const firefox = decideOcr("scanned", textless(3), { hardwareConcurrency: 8 });
  assert.equal(firefox.run, true);

  // NaN is "unknown", not "low".
  assert.equal(decideOcr("scanned", textless(3), { deviceMemory: NaN }).run, true);
});

test("decideOcr: 4GB is the lowest RAM that runs", () => {
  assert.equal(decideOcr("scanned", textless(3), { deviceMemory: 4 }).run, true);
  assert.equal(decideOcr("scanned", textless(3), { deviceMemory: 3.9 }).run, false);
});

test("decideOcr: unsupported browsers are blocked before device checks", () => {
  assert.deepEqual(decideOcr("scanned", textless(3), {}, false), {
    run: false,
    reason: "unsupported",
  });
});

test("decideOcr: per-file cap truncates and reports the remainder", () => {
  const d = decideOcr("scanned", textless(60), { deviceMemory: 8 });
  assert.equal(d.run, true);
  if (!d.run) return;
  assert.equal(d.pages.length, OCR_MAX_PAGES);
  assert.equal(d.truncated, 60 - OCR_MAX_PAGES);
  assert.equal(d.pages[0], 1);
  assert.equal(d.pages.at(-1), OCR_MAX_PAGES);
});

test("decideOcr: exactly at the cap is not truncated", () => {
  const d = decideOcr("scanned", textless(OCR_MAX_PAGES), { deviceMemory: 8 });
  assert.equal(d.run, true);
  if (!d.run) return;
  assert.equal(d.truncated, 0);
});

test("decideOcr: silent boundary at OCR_SILENT_PAGE_MAX", () => {
  assert.equal(OCR_SILENT_PAGE_MAX, 5);
  const quiet = decideOcr("scanned", textless(5), { deviceMemory: 8 });
  const loud = decideOcr("scanned", textless(6), { deviceMemory: 8 });
  assert.equal(quiet.run && quiet.silent, true);
  assert.equal(loud.run && loud.silent, false);
});

test("decideOcr: OCRs only the pages given, preserving their numbers", () => {
  // "mixed" documents pass a sparse page list — never a 1..N range.
  const d = decideOcr("mixed", [7, 8, 9, 40], { deviceMemory: 8 });
  assert.equal(d.run, true);
  if (!d.run) return;
  assert.deepEqual(d.pages, [7, 8, 9, 40]);
});

test("decideOcr: the search-wide budget caps below the per-file cap", () => {
  // The per-file cap of 50 is trivially defeated by a batch of scanned files,
  // so the remaining search budget must win when it is smaller.
  const d = decideOcr("scanned", textless(50), { deviceMemory: 8 }, true, 12);
  assert.equal(d.run, true);
  if (!d.run) return;
  assert.equal(d.pages.length, 12);
  assert.equal(d.truncated, 38);
});

test("decideOcr: an exhausted budget reports 'budget'", () => {
  assert.deepEqual(
    decideOcr("scanned", textless(10), { deviceMemory: 8 }, true, 0),
    { run: false, reason: "budget" }
  );
});

test("decideOcr: default budget is the search-wide cap", () => {
  const d = decideOcr("scanned", textless(200), { deviceMemory: 8 });
  assert.equal(d.run, true);
  if (!d.run) return;
  // Per-file cap still binds first, since 50 < 100.
  assert.equal(d.pages.length, OCR_MAX_PAGES);
  assert.ok(OCR_MAX_PAGES <= OCR_MAX_PAGES_PER_SEARCH);
});

// ─── refundBudget ─────────────────────────────────────────────────────────────

test("refundBudget: a fully spent claim refunds nothing", () => {
  assert.equal(refundBudget(50, 50), 0);
});

test("refundBudget: an unspent claim is returned in full", () => {
  // The bug this exists to prevent: a scan that failed before reading a single
  // page used to keep all 50 claimed pages, starving every later scanned file.
  assert.equal(refundBudget(50, 0), 50);
});

test("refundBudget: a partial run refunds only the remainder", () => {
  assert.equal(refundBudget(50, 30), 20);
  assert.equal(refundBudget(12, 11), 1);
});

test("refundBudget: never grows the allowance", () => {
  // Over-spend or nonsense input must not hand back budget that was never
  // claimed, or the search-wide cap stops being a cap.
  assert.equal(refundBudget(10, 20), 0);
  assert.equal(refundBudget(0, 5), 0);
  assert.equal(refundBudget(10, -5), 10);
  assert.equal(refundBudget(NaN, 5), 0);
  assert.equal(refundBudget(10, NaN), 0);
  assert.equal(refundBudget(Infinity, 0), 0);
});

test("refundBudget: a batch of failing scans cannot exhaust the allowance", () => {
  // Models the real regression across a multi-file search: three scanned files
  // each claim the per-file cap and each fail outright. Before the refund the
  // allowance hit 0 and the third file was refused with reason "budget".
  let left = OCR_MAX_PAGES_PER_SEARCH;
  for (let i = 0; i < 3; i++) {
    const d = decideOcr("scanned", textless(OCR_MAX_PAGES), { deviceMemory: 8 }, true, left);
    assert.equal(d.run, true, `file ${i + 1} should still be allowed to OCR`);
    if (!d.run) return;
    left -= d.pages.length;          // claim
    left += refundBudget(d.pages.length, 0); // run failed, spent nothing
  }
  assert.equal(left, OCR_MAX_PAGES_PER_SEARCH);
});

test("refundBudget: successful runs still consume the allowance", () => {
  // The refund must not defeat the cap: real work spends real budget.
  let left = OCR_MAX_PAGES_PER_SEARCH;
  const d1 = decideOcr("scanned", textless(50), { deviceMemory: 8 }, true, left);
  if (!d1.run) throw new Error("expected run");
  left -= d1.pages.length;
  left += refundBudget(d1.pages.length, d1.pages.length); // all 50 read
  assert.equal(left, OCR_MAX_PAGES_PER_SEARCH - 50);

  const d2 = decideOcr("scanned", textless(50), { deviceMemory: 8 }, true, left);
  if (!d2.run) throw new Error("expected run");
  left -= d2.pages.length;
  left += refundBudget(d2.pages.length, d2.pages.length);
  assert.equal(left, 0);

  // Third file is correctly refused — the cap still holds.
  assert.deepEqual(decideOcr("scanned", textless(10), { deviceMemory: 8 }, true, left), {
    run: false,
    reason: "budget",
  });
});

// ─── computeRenderScale ───────────────────────────────────────────────────────

test("computeRenderScale: US Letter renders at the target DPI", () => {
  const scale = computeRenderScale(612, 792);
  assert.equal(scale, OCR_TARGET_DPI / 72);
  assert.equal(scale, 2.5);
  // And stays inside the pixel budget.
  assert.ok(612 * scale * 792 * scale <= OCR_MAX_PIXELS);
});

test("computeRenderScale: A4 also fits the budget at full scale", () => {
  const scale = computeRenderScale(595, 842);
  assert.equal(scale, 2.5);
  assert.ok(595 * scale * 842 * scale <= OCR_MAX_PIXELS);
  // The tightest ordinary page against the cap — keep the headroom honest.
  assert.ok(Math.ceil(595 * scale) * Math.ceil(842 * scale) <= OCR_MAX_PIXELS);
});

test("computeRenderScale: the budget must not bind on ordinary paper", () => {
  // Regression guard for a real bug: OCR_MAX_PIXELS was originally set below a
  // full-scale Letter page, so the cap silently clamped EVERY page slightly
  // under target instead of only catching large-format outliers.
  // Every common paper size, including US Legal — scanned legal filings are a
  // core case for this feature, and Legal is the tightest of the three.
  for (const [w, h, label] of [
    [612, 792, "Letter"],
    [595, 842, "A4"],
    [612, 1008, "US Legal"],
    [420, 595, "A5"],
  ] as const) {
    assert.equal(
      computeRenderScale(w, h),
      OCR_TARGET_DPI / 72,
      `${label} should render at full target scale`
    );
    assert.ok(
      Math.ceil(w * 2.5) * Math.ceil(h * 2.5) <= OCR_MAX_PIXELS,
      `${label} must fit the pixel budget at full scale`
    );
  }

  // A3 and up are genuine large formats: clamping them is correct.
  assert.ok(computeRenderScale(842, 1191) < OCR_TARGET_DPI / 72);
});

test("computeRenderScale: large-format sheets are clamped down", () => {
  // E-size engineering drawing. At 2.5x this would be a ~280MB bitmap.
  const scale = computeRenderScale(3370, 2384);
  assert.ok(scale < 2.5, `expected clamping, got ${scale}`);

  // Here the floor wins over the budget by design: going below 1x would render
  // the page smaller than its own point size and destroy recognition. So the
  // budget is best-effort and this bitmap does exceed it — documented, not a bug.
  assert.equal(scale, 1);
  assert.ok(3370 * scale * 2384 * scale > OCR_MAX_PIXELS);
});

test("computeRenderScale: mid-size sheets land between the floor and target", () => {
  // A sheet big enough for the budget to bite, but not so big the floor wins.
  const scale = computeRenderScale(1200, 1800);
  assert.ok(scale > 1 && scale < 2.5, `expected an interior scale, got ${scale}`);
  assert.ok(1200 * scale * 1800 * scale <= OCR_MAX_PIXELS * 1.0001);
});

test("computeRenderScale: never returns less than 1", () => {
  // A poster-sized page would compute a sub-1 budget; upscaling to nothing
  // would make OCR useless, so 1 is the floor.
  assert.equal(computeRenderScale(20000, 20000), 1);
  assert.ok(computeRenderScale(5000, 5000) >= 1);
});

test("computeRenderScale: degenerate page sizes do not return Infinity", () => {
  for (const [w, h] of [
    [1, 1],
    [0, 0],
    [0, 792],
    [-612, 792],
    [NaN, 792],
    [Infinity, 792],
  ]) {
    const s = computeRenderScale(w, h);
    assert.ok(Number.isFinite(s), `scale for ${w}x${h} was ${s}`);
    assert.ok(s >= 1, `scale for ${w}x${h} was ${s}`);
    assert.ok(s <= 2.5, `scale for ${w}x${h} was ${s}`);
  }
});

// ─── Messages ─────────────────────────────────────────────────────────────────

test("ocrSkipMessage: names the file and explains the real reason", () => {
  const mobile = ocrSkipMessage("mobile", "statement.pdf");
  assert.match(mobile, /statement\.pdf/);
  assert.match(mobile, /desktop/i);

  // Each reason must say something different — a generic message here is how
  // the misleading "try a different spelling" advice happened in the first place.
  const reasons = ["mobile", "low-memory", "unsupported", "budget"] as const;
  const messages = reasons.map((r) => ocrSkipMessage(r, "f.pdf"));
  assert.equal(new Set(messages).size, reasons.length);
  for (const m of messages) {
    assert.match(m, /f\.pdf/);
    assert.ok(m.length > 20);
  }
});

test("ocrTruncatedNote: counts and pluralizes correctly", () => {
  assert.match(ocrTruncatedNote(50, 60), /first 50 scanned pages/);
  assert.match(ocrTruncatedNote(50, 60), /10 more were skipped/);
  assert.match(ocrTruncatedNote(1, 2), /first 1 scanned page —/);
  assert.match(ocrTruncatedNote(49, 50), /1 more was skipped/);
});

// ─── enqueueOcr ───────────────────────────────────────────────────────────────

test("enqueueOcr: runs jobs strictly one at a time, in order", async () => {
  resetOcrQueue();
  const events: string[] = [];
  let active = 0;

  const job = (name: string, ms: number) => () =>
    new Promise<string>((resolve) => {
      active++;
      // The whole point of the queue: never two at once.
      assert.equal(active, 1, `${name} overlapped another job`);
      events.push(`start:${name}`);
      setTimeout(() => {
        events.push(`end:${name}`);
        active--;
        resolve(name);
      }, ms);
    });

  // Deliberately give the first job the longest delay: if the queue were not
  // serializing, "c" would finish first and the order would differ.
  const all = await Promise.all([
    enqueueOcr(job("a", 30)),
    enqueueOcr(job("b", 10)),
    enqueueOcr(job("c", 1)),
  ]);

  assert.deepEqual(all, ["a", "b", "c"]);
  assert.deepEqual(events, [
    "start:a",
    "end:a",
    "start:b",
    "end:b",
    "start:c",
    "end:c",
  ]);
});

test("enqueueOcr: a rejecting job does not poison the queue", async () => {
  resetOcrQueue();
  const boom = enqueueOcr(async () => {
    throw new Error("page 3 blew up");
  });
  await assert.rejects(boom, /page 3 blew up/);

  // The successor must still run — a single failed file cannot stall OCR for
  // the rest of the search.
  const after = await enqueueOcr(async () => "still working");
  assert.equal(after, "still working");
});

test("enqueueOcr: a rejection mid-chain still lets later jobs run in order", async () => {
  resetOcrQueue();
  const order: string[] = [];
  const ok = (n: string) => enqueueOcr(async () => { order.push(n); return n; });

  const p1 = ok("one");
  const p2 = enqueueOcr(async () => { order.push("bad"); throw new Error("x"); });
  const p3 = ok("three");

  await p1;
  await assert.rejects(p2, /x/);
  await p3;
  assert.deepEqual(order, ["one", "bad", "three"]);
});
