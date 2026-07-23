/**
 * Copies the pdf.js worker (version-locked to the installed pdfjs-dist)
 * into public/ so it's served same-origin. Runs automatically via the
 * predev/prebuild npm scripts; public/pdf.worker.min.mjs is gitignored.
 *
 * Rationale: previously loaded from cdnjs — a third-party single point of
 * failure requiring CSP allowances and paying cross-origin DNS/TLS on the
 * first search.
 */

import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const dest = join(root, "public/pdf.worker.min.mjs");

await mkdir(dirname(dest), { recursive: true });
await copyFile(src, dest);
console.log("[copy-pdf-worker] public/pdf.worker.min.mjs updated");
