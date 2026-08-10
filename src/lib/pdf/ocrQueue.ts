/**
 * Admission control for OCR jobs.
 *
 * Was a strict FIFO of one job at a time, on the reasoning that two concurrent
 * recognizers would fight over one core. Measurement changed that: recognition
 * is ~95% of OCR cost and tesseract has no threaded build, so the fix is more
 * recognizers, not fewer. The worker now runs a pool of them.
 *
 * This still exists because unbounded admission would be worse than either:
 * every scanned file in a batch would open its own pdf.js document and hold its
 * own decoded page bitmap while waiting for a free recognizer. So jobs are
 * admitted up to a limit, and the pool keeps itself busy from there.
 */

/** Concurrently admitted OCR jobs. One spare beyond the default pool of 2. */
export const OCR_JOB_LIMIT = 3;

let active = 0;
const waiting: Array<() => void> = [];

function release(): void {
  active--;
  // Wake exactly one waiter, preserving arrival order.
  const next = waiting.shift();
  if (next) next();
}

/**
 * Runs `job` once a slot is free.
 *
 * Slots are released in a `finally`, so a rejected job cannot leak one and
 * slowly starve the queue. The returned promise still rejects — callers see the
 * real failure.
 */
export function enqueueOcr<T>(job: () => Promise<T>): Promise<T> {
  const start = async (): Promise<T> => {
    active++;
    try {
      return await job();
    } finally {
      release();
    }
  };

  if (active < OCR_JOB_LIMIT) return start();
  return new Promise<void>((resolve) => waiting.push(resolve)).then(start);
}

/** Jobs running right now — for tests and diagnostics. */
export function ocrActiveCount(): number {
  return active;
}

/** Test seam — drops any queued waiters and resets the counter. */
export function resetOcrQueue(): void {
  active = 0;
  waiting.length = 0;
}
