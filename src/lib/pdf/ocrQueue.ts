/**
 * Global OCR serialization.
 *
 * File parsing runs up to `computeConcurrency()` files in parallel, which is
 * right for I/O-bound pdf.js work. OCR is CPU-bound and single-threaded (no
 * COOP/COEP means no SharedArrayBuffer), so two concurrent runs would mean two
 * WASM instances (~100MB) and two canvases fighting over the same cores — each
 * run more than 2x slower than serial, for double the memory.
 *
 * Serializing here rather than lowering file concurrency keeps the fast
 * text-layer files parallel: four text files parse happily while a fifth waits
 * at this gate. The gate only pinches when two files are both scanned, which is
 * exactly the case worth pinching.
 *
 * It also makes progress representable: because exactly one OCR job runs at a
 * time, OcrProgress can be a single object rather than a map.
 */

let chain: Promise<unknown> = Promise.resolve();

/** Runs `job` after every previously enqueued job has settled. */
export function enqueueOcr<T>(job: () => Promise<T>): Promise<T> {
  // `.then(job, job)` on both paths: a rejected predecessor must not skip or
  // poison its successors.
  const next = chain.then(job, job);
  // Keep the chain itself always-fulfilled so one failure can't stall the queue.
  chain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

/** Test seam — drops any queued continuation state. */
export function resetOcrQueue(): void {
  chain = Promise.resolve();
}
