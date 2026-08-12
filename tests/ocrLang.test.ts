import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  OCR_LANGS,
  OCR_DEFAULT_LANG,
  normalizeLang,
  sniffLangFromText,
  resolveOcrLang,
} from "../src/lib/pdf/ocrLang.ts";

// ─── OCR_LANGS ──────────────────────────────────────────────────────────────

describe("OCR_LANGS", () => {
  test("every entry has a non-empty code, label, and bcp47 array", () => {
    for (const entry of OCR_LANGS) {
      assert.ok(entry.code.length > 0, `code is non-empty`);
      assert.ok(entry.label.length > 0, `label is non-empty`);
      assert.ok(entry.bcp47.length > 0, `bcp47 has at least one prefix`);
    }
  });

  test("codes are unique", () => {
    const codes = OCR_LANGS.map((l) => l.code);
    assert.equal(codes.length, new Set(codes).size, "duplicate code found");
  });

  test("default lang is in the shipped set", () => {
    assert.ok(
      OCR_LANGS.some((l) => l.code === OCR_DEFAULT_LANG),
      `${OCR_DEFAULT_LANG} must be in OCR_LANGS`
    );
  });

  /**
   * Guard test: the shipped lang codes must match the copy script's
   * LANG_ASSETS array. The two live in different module systems (.mjs vs
   * .ts), so the duplication is forced — this test is what makes it safe.
   *
   * Extracts the LANG_ASSETS array entries from the script source. The
   * script lists codes as bare quoted strings inside the array, e.g.
   * `"eng"`, `"spa"`, etc.
   */
  test("OCR_LANGS matches copy-tesseract-assets LANG_ASSETS", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const scriptPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      "..",
      "scripts",
      "copy-tesseract-assets.mjs"
    );
    const source = await fs.readFile(scriptPath, "utf-8");
    // Extract the LANG_ASSETS array block, then pull quoted strings from it.
    const arrayMatch = source.match(
      /const LANG_ASSETS\s*=\s*\[([\s\S]*?)\];/
    );
    assert.ok(arrayMatch, "LANG_ASSETS array not found in copy script");
    const scriptCodes = new Set<string>();
    const codePattern = /"([a-z_]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = codePattern.exec(arrayMatch[1])) !== null) {
      scriptCodes.add(m[1]);
    }
    const ocrLangCodes = new Set(OCR_LANGS.map((l) => l.code));
    for (const code of ocrLangCodes) {
      assert.ok(
        scriptCodes.has(code),
        `OCR_LANGS has "${code}" but copy-tesseract-assets.mjs does not`
      );
    }
    for (const code of scriptCodes) {
      assert.ok(
        ocrLangCodes.has(code),
        `copy-tesseract-assets.mjs has "${code}" but OCR_LANGS does not`
      );
    }
  });
});

// ─── normalizeLang ──────────────────────────────────────────────────────────

describe("normalizeLang", () => {
  test("maps common BCP-47 tags to tesseract codes", () => {
    assert.equal(normalizeLang("en"), "eng");
    assert.equal(normalizeLang("en-US"), "eng");
    assert.equal(normalizeLang("en-GB"), "eng");
    assert.equal(normalizeLang("de"), "deu");
    assert.equal(normalizeLang("de-DE"), "deu");
    assert.equal(normalizeLang("de-AT"), "deu");
    assert.equal(normalizeLang("fr"), "fra");
    assert.equal(normalizeLang("fr-FR"), "fra");
    assert.equal(normalizeLang("es"), "spa");
    assert.equal(normalizeLang("es-MX"), "spa");
    assert.equal(normalizeLang("it"), "ita");
    assert.equal(normalizeLang("pt"), "por");
    assert.equal(normalizeLang("pt-BR"), "por");
    assert.equal(normalizeLang("ru"), "rus");
    assert.equal(normalizeLang("ru-RU"), "rus");
  });

  test("handles underscore separators (de_DE)", () => {
    assert.equal(normalizeLang("de_DE"), "deu");
    assert.equal(normalizeLang("pt_BR"), "por");
  });

  test("is case-insensitive", () => {
    assert.equal(normalizeLang("EN"), "eng");
    assert.equal(normalizeLang("De-de"), "deu");
    assert.equal(normalizeLang("FR-fr"), "fra");
  });

  test("rejects unshipped languages", () => {
    assert.equal(normalizeLang("zh"), null);
    assert.equal(normalizeLang("ja"), null);
    assert.equal(normalizeLang("ko"), null);
    assert.equal(normalizeLang("ar"), null);
    assert.equal(normalizeLang("hi"), null);
  });

  test("rejects empty, undefined, and garbage", () => {
    assert.equal(normalizeLang(undefined), null);
    assert.equal(normalizeLang(""), null);
    assert.equal(normalizeLang("  "), null);
    assert.equal(normalizeLang("xxx"), null);
    assert.equal(normalizeLang("123"), null);
  });
});

// ─── sniffLangFromText ──────────────────────────────────────────────────────

describe("sniffLangFromText", () => {
  test("detects English from a text sample", () => {
    const sample =
      "The committee has been working with the board to ensure that all " +
      "requirements have been met. They would like to confirm that the " +
      "proposal was reviewed and that the recommendations were accepted " +
      "by the full board. This document contains the findings from their " +
      "investigation, which should be shared with all relevant parties. " +
      "The results have been compiled and are available for review.";
    assert.equal(sniffLangFromText(sample), "eng");
  });

  test("detects Spanish from a text sample", () => {
    const sample =
      "Este documento contiene los resultados del análisis que se realizó " +
      "para determinar las necesidades del proyecto. Las conclusiones " +
      "indican que los recursos disponibles son suficientes para cumplir " +
      "con los objetivos establecidos. Por esta razón, se recomienda " +
      "proceder con la implementación del plan como fue aprobado por " +
      "el comité directivo en la reunión del mes pasado.";
    assert.equal(sniffLangFromText(sample), "spa");
  });

  test("detects French from a text sample", () => {
    const sample =
      "Les résultats de cette étude sont présentés dans le rapport qui " +
      "suit. Nous avons analysé les données recueillies sur une période " +
      "de six mois pour déterminer les tendances principales. Dans " +
      "l'ensemble, les conclusions sont positives et nous recommandons " +
      "de poursuivre les efforts dans cette direction. Pour plus de " +
      "détails, vous pouvez consulter les annexes du document.";
    assert.equal(sniffLangFromText(sample), "fra");
  });

  test("detects German from a text sample", () => {
    const sample =
      "Die Ergebnisse der Untersuchung werden im folgenden Bericht " +
      "dargestellt. Es wurde festgestellt, dass die vorhandenen " +
      "Ressourcen nicht ausreichend sind, um das Projekt wie geplant " +
      "durchzuführen. Aus diesem Grund wird empfohlen, den Zeitplan " +
      "anzupassen und zusätzliche Mittel bereitzustellen. Der Bericht " +
      "enthält auch eine detaillierte Analyse der bisherigen Fortschritte.";
    assert.equal(sniffLangFromText(sample), "deu");
  });

  test("detects Russian from a text sample", () => {
    const sample =
      "Это исследование было проведено для определения основных " +
      "тенденций развития отрасли. Как показывают результаты, " +
      "текущая ситуация требует значительных изменений при " +
      "планировании будущих проектов. Все данные были собраны " +
      "и проанализированы, что позволяет сделать выводы о " +
      "необходимости модернизации существующей инфраструктуры.";
    assert.equal(sniffLangFromText(sample), "rus");
  });

  test("returns null for text shorter than 200 chars", () => {
    assert.equal(sniffLangFromText("The quick brown fox."), null);
    assert.equal(sniffLangFromText("a".repeat(199)), null);
  });

  test("returns null for empty or undefined-ish input", () => {
    assert.equal(sniffLangFromText(""), null);
    assert.equal(sniffLangFromText("   "), null);
  });

  test("returns null when no clear winner (ambiguous text)", () => {
    // A string with no stopwords from any language.
    const noise = ("alpha beta gamma delta " + "epsilon zeta eta theta ").repeat(15);
    assert.equal(sniffLangFromText(noise), null);
  });
});

// ─── resolveOcrLang ─────────────────────────────────────────────────────────

describe("resolveOcrLang", () => {
  test("user pick wins over everything", () => {
    const result = resolveOcrLang({
      userLang: "deu",
      docLang: "en",
      textSample: "The committee has been working with the board to ensure " +
        "that all requirements have been met. They would like to confirm " +
        "that the proposal was reviewed and that the recommendations were " +
        "accepted by the full board.",
    });
    assert.equal(result.lang, "deu");
    assert.equal(result.source, "user");
  });

  test("user pick rejects unshipped codes and falls through", () => {
    const result = resolveOcrLang({ userLang: "zh" });
    assert.equal(result.lang, "eng");
    assert.equal(result.source, "default");
  });

  test("text sniff beats metadata", () => {
    const frenchText =
      "Les résultats de cette étude sont présentés dans le rapport. " +
      "Nous avons analysé les données sur une période de six mois pour " +
      "déterminer les tendances principales. Dans l'ensemble, les " +
      "conclusions sont positives et nous recommandons de poursuivre.";
    const result = resolveOcrLang({
      docLang: "en",
      textSample: frenchText,
    });
    assert.equal(result.lang, "fra");
    assert.equal(result.source, "sniff");
  });

  test("metadata is used when no sniff and no user pick", () => {
    const result = resolveOcrLang({ docLang: "de-DE" });
    assert.equal(result.lang, "deu");
    assert.equal(result.source, "metadata");
  });

  test("metadata rejects unshipped tags and falls to default", () => {
    const result = resolveOcrLang({ docLang: "zh-CN" });
    assert.equal(result.lang, "eng");
    assert.equal(result.source, "default");
  });

  test("defaults to English when nothing is available", () => {
    const result = resolveOcrLang({});
    assert.equal(result.lang, "eng");
    assert.equal(result.source, "default");
  });

  test("defaults when text sample is too short to sniff", () => {
    const result = resolveOcrLang({ textSample: "Short text." });
    assert.equal(result.lang, "eng");
    assert.equal(result.source, "default");
  });
});
