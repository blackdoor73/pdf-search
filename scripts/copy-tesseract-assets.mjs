/**
 * Copies the tesseract.js worker + WASM cores into public/ so they are served
 * same-origin. Runs automatically via the predev/prebuild npm scripts; the
 * copied files are gitignored.
 *
 * Same rationale as copy-pdf-worker.mjs: the CSP in next.config.js sets
 * `connect-src 'self'`, so tesseract's default jsDelivr CDN fetches are
 * blocked outright. Self-hosting is the only option, and it also removes a
 * third-party single point of failure from a privacy-positioned product.
 *
 * Which cores: tesseract.js picks one at runtime from `corePath` treated as a
 * directory, based on WASM feature detection on the visitor's device
 * (see node_modules/tesseract.js/src/worker-script/browser/getCore.js).
 * Because we request OEM.LSTM_ONLY, it only ever asks for a `-lstm` variant,
 * of which there are three — relaxedsimd / simd / plain — and we cannot know
 * in advance which the device supports. So all three ship. Each .wasm.js
 * inlines its own WASM binary, so the sibling .wasm files are NOT needed.
 *
 * The language data comes from @tesseract.js-data/eng, installed as a normal
 * dependency. We take the `4.0.0_best_int` build (2.9MB gz) rather than
 * `4.0.0` (10.9MB gz): the latter also carries the Legacy-model data, which
 * OEM.LSTM_ONLY never touches. This is the same pairing tesseract.js itself
 * defaults to for LSTM-only (worker-script/index.js), so accuracy is
 * unchanged — it is purely the 8MB of unused Legacy data left behind.
 */

import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public/tesseract");

/** [source, destination-basename] */
const assets = [
  ["node_modules/tesseract.js/dist/worker.min.js", "worker.min.js"],
  // LSTM-only cores, one per WASM feature-detection outcome.
  [
    "node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js",
    "tesseract-core-relaxedsimd-lstm.wasm.js",
  ],
  [
    "node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js",
    "tesseract-core-simd-lstm.wasm.js",
  ],
  [
    "node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js",
    "tesseract-core-lstm.wasm.js",
  ],
];

// Language data. tesseract.js fetches `${langPath}/<code>.traineddata.gz`, so
// basenames must be exactly `<code>.traineddata.gz`.
//
// This list MUST match OCR_LANGS in src/lib/pdf/ocrLang.ts — the two live in
// different module systems (.mjs vs .ts), so the duplication is forced, and
// tests/ocrLang.test.ts enforces the match.
//
// Measured sizes (4.0.0_best_int, compressed):
//   eng 2.95MB, fra 0.67MB, deu 1.27MB, ita 1.58MB,
//   por 1.33MB, spa 2.00MB, rus 2.56MB,
//   hin 1.39MB, chi_sim 1.72MB, chi_tra 1.58MB
//
// Note the CJK models are SMALLER than eng, not larger. npm's unpackedSize for
// @tesseract.js-data/chi_sim (~21.9MB) counts the Legacy `4.0.0/` build, which
// OEM.LSTM_ONLY never loads — only the `4.0.0_best_int/` .gz below is shipped.
const LANG_ASSETS = [
  "eng",
  "spa",
  "fra",
  "deu",
  "ita",
  "por",
  "rus",
  "hin",
  "chi_sim",
  "chi_tra",
];

for (const lang of LANG_ASSETS) {
  assets.push([
    `node_modules/@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,
    `lang/${lang}.traineddata.gz`,
  ]);
}

for (const [src, name] of assets) {
  const srcPath = join(root, src);
  const dest = join(outDir, name);
  await mkdir(dirname(dest), { recursive: true });
  try {
    await copyFile(srcPath, dest);
  } catch (err) {
    // Fail loudly — a silent skip becomes a 404 at recognize time on one
    // language only, the worst way to find out.
    console.error(`[copy-tesseract-assets] FATAL: cannot copy ${src}`);
    console.error(err.message);
    process.exit(1);
  }
}
console.log(`[copy-tesseract-assets] ${assets.length} files → public/tesseract/`);
