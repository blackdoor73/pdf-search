/**
 * Synthetic PDF fixtures for the OCR benchmark, generated in the browser.
 *
 * Dev-only: imported solely by src/app/dev/ocr-bench. Generating fixtures
 * instead of committing sample PDFs keeps ~MBs of binaries out of the repo and
 * makes the corpus reproducible — same text, same layout, every run.
 *
 * `makeScannedPdf` produces a genuinely image-only PDF (a JPEG wrapped in a
 * minimal PDF with no text operators), which is what makes it a real OCR
 * target: pdf.js reports zero text characters for it.
 */

const LETTER_W = 612;
const LETTER_H = 792;

/** Body text drawn onto each synthetic page. */
const BODY = [
  "QUARTERLY FINANCIAL STATEMENT",
  "",
  "Account holder: Jane Morrison",
  "Statement period: 01 July 2026 - 30 September 2026",
  "",
  "The invoice total for the period is 48,215.00 USD.",
  "Outstanding balance carried forward: 3,120.44 USD.",
  "",
  "Please remit payment within thirty days of receipt.",
  "Reference number ABC-0001234 must appear on all",
  "correspondence regarding this statement.",
];

function renderPageJpeg(pageNum: number, totalPages: number): Uint8Array {
  // 150 DPI Letter — a realistic scan resolution.
  const W = 1275;
  const H = 1650;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  if (!g) throw new Error("no 2d context");

  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#111111";
  g.font = "40px 'Times New Roman', Times, serif";

  let y = 150;
  g.fillText(`Page ${pageNum} of ${totalPages}`, 110, y);
  y += 90;
  for (const line of BODY) {
    g.fillText(line, 110, y);
    y += 58;
  }

  const b64 = c.toDataURL("image/jpeg", 0.92).split(",")[1];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * An image-only PDF of `pageCount` pages — no text layer whatsoever.
 * Each page is a DCTDecode image XObject with no text-drawing operators.
 */
export async function makeScannedPdf(pageCount: number): Promise<File> {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;

  const push = (u: Uint8Array) => {
    parts.push(u);
    len += u.length;
  };
  const ps = (s: string) => push(enc.encode(s));
  const obj = (n: number, body: string) => {
    offsets[n] = len;
    ps(`${n} 0 obj\n${body}\nendobj\n`);
  };

  // Object numbering: 1 catalog, 2 pages, then per page a page object, a
  // contents stream and an image XObject.
  const pageObjNum = (i: number) => 3 + i * 3;
  const contentObjNum = (i: number) => 4 + i * 3;
  const imageObjNum = (i: number) => 5 + i * 3;

  ps("%PDF-1.4\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const kids = Array.from({ length: pageCount }, (_, i) => `${pageObjNum(i)} 0 R`).join(" ");
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);

  for (let i = 0; i < pageCount; i++) {
    const jpeg = renderPageJpeg(i + 1, pageCount);
    obj(
      pageObjNum(i),
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LETTER_W} ${LETTER_H}] ` +
        `/Resources << /XObject << /Im0 ${imageObjNum(i)} 0 R >> >> ` +
        `/Contents ${contentObjNum(i)} 0 R >>`
    );
    const ct = `q ${LETTER_W} 0 0 ${LETTER_H} 0 0 cm /Im0 Do Q`;
    obj(contentObjNum(i), `<< /Length ${ct.length} >>\nstream\n${ct}\nendstream`);

    offsets[imageObjNum(i)] = len;
    ps(
      `${imageObjNum(i)} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1275 ` +
        `/Height 1650 /ColorSpace /DeviceRGB /BitsPerComponent 8 ` +
        `/Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
    );
    push(jpeg);
    ps("\nendstream\nendobj\n");
  }

  const maxObj = 2 + pageCount * 3;
  const xrefStart = len;
  let xref = `xref\n0 ${maxObj + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= maxObj; n++) {
    xref += String(offsets[n] ?? 0).padStart(10, "0") + " 00000 n \n";
  }
  xref += `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  ps(xref);

  const blob = new Blob(parts as BlobPart[], { type: "application/pdf" });
  return new File([blob], `scanned-${pageCount}p.pdf`, { type: "application/pdf" });
}

/** A native-text PDF — the control case, which must never trigger OCR. */
export async function makeTextPdf(pageCount: number): Promise<File> {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (u: Uint8Array) => {
    parts.push(u);
    len += u.length;
  };
  const ps = (s: string) => push(enc.encode(s));
  const obj = (n: number, body: string) => {
    offsets[n] = len;
    ps(`${n} 0 obj\n${body}\nendobj\n`);
  };

  const fontNum = 3;
  const pageObjNum = (i: number) => 4 + i * 2;
  const contentObjNum = (i: number) => 5 + i * 2;

  ps("%PDF-1.4\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const kids = Array.from({ length: pageCount }, (_, i) => `${pageObjNum(i)} 0 R`).join(" ");
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);
  obj(fontNum, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  for (let i = 0; i < pageCount; i++) {
    obj(
      pageObjNum(i),
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${LETTER_W} ${LETTER_H}] ` +
        `/Resources << /Font << /F1 ${fontNum} 0 R >> >> /Contents ${contentObjNum(i)} 0 R >>`
    );
    let y = 720;
    const ops = [`BT /F1 12 Tf 72 ${y} Td (Page ${i + 1} of ${pageCount}) Tj ET`];
    for (const line of BODY) {
      y -= 24;
      // Escape PDF string metacharacters.
      const safe = line.replace(/([\\()])/g, "\\$1");
      ops.push(`BT /F1 12 Tf 72 ${y} Td (${safe}) Tj ET`);
    }
    const ct = ops.join("\n");
    obj(contentObjNum(i), `<< /Length ${ct.length} >>\nstream\n${ct}\nendstream`);
  }

  const maxObj = 3 + pageCount * 2;
  const xrefStart = len;
  let xref = `xref\n0 ${maxObj + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= maxObj; n++) {
    xref += String(offsets[n] ?? 0).padStart(10, "0") + " 00000 n \n";
  }
  xref += `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  ps(xref);

  const blob = new Blob(parts as BlobPart[], { type: "application/pdf" });
  return new File([blob], `text-${pageCount}p.pdf`, { type: "application/pdf" });
}
