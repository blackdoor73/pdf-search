/**
 * Zero-cost OCR teardown.
 *
 * Deliberately tiny and dependency-free: teardown paths (clearFiles,
 * cancelSearch) run for every visitor, and importing ocrClient there would
 * pull in the OCR worker chunk for the ~98% who never open a scanned PDF.
 * This module reads a flag that ocrClient sets, and only imports the real
 * module when there is genuinely a worker to release.
 */

const LIVE_FLAG = "__pdfsearchOcrLive";

/** True when an OCR worker has been created and not yet disposed. */
export function ocrWorkerExists(): boolean {
  return Boolean((globalThis as Record<string, unknown>)[LIVE_FLAG]);
}

/** Releases the OCR worker if one exists. No-op (and no import) otherwise. */
export function releaseOcrIfLive(): void {
  if (!ocrWorkerExists()) return;
  void import("./ocrClient").then((m) => m.disposeOcr());
}
