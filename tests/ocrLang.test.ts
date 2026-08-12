import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  OCR_LANGS,
  OCR_DEFAULT_LANG,
  CJK_CHAR,
  DEVANAGARI_CHAR,
  despaceCjk,
  truncateGraphemes,
  buildSearchPattern,
  normalizeLang,
  sniffLangFromText,
  resolveOcrLang,
} from "../src/lib/pdf/ocrLang.ts";
import { createHighlightedHtml, escapeRegex } from "../src/lib/security/index.ts";

/** Convenience: does the pattern match anywhere in the line? */
function matches(
  query: string,
  line: string,
  opts: { caseSensitive?: boolean; wholeWord?: boolean } = {}
): boolean {
  const re = buildSearchPattern(query, opts);
  return re !== null && re.test(line);
}

// ─── Shared script samples ──────────────────────────────────────────────────
//
// Measured CJK ratios (share of non-whitespace chars) are noted per sample.
// The 0.66-vs-0.03 gap either side of the 0.2 threshold is what makes the
// heuristic safe, so these are fixtures, not throwaway strings.

/** 0.93 CJK. Deliberately under 200 chars — see the stopword-floor test. */
const ZH_SIMPLIFIED =
  "这是一个测试文件。本报告包含多个章节，每个章节都有详细的数据分析和验证结果。" +
  "我们的研究表明，这种方法在实际应用中效果显著。第一章介绍了基本概念和理论框架，" +
  "第二章描述了实验设计和数据收集过程。";

/** 0.93 CJK, variant-exclusive characters throughout. */
const ZH_TRADITIONAL =
  "這是一個測試文件。本報告包含多個章節，每個章節都有詳細的數據分析和驗證結果。" +
  "我們的研究表明，這種方法在實際應用中效果顯著。第一章介紹了基本概念和理論框架，" +
  "第二章描述了實驗設計和數據收集過程。";

/** 0.66 CJK — a real bilingual report. Must resolve to Chinese. */
const ZH_WITH_ENGLISH_HEADERS =
  "Quarterly Report 2024\n" +
  "第一章、公司概况与经营情况\n" +
  "本报告包含多个章节，每个章节都有详细的数据分析和验证结果。" +
  "我们的研究表明，这种方法在实际应用中效果显著。\n" +
  "Section 2: Regional Performance\n" +
  "第二章、区域业绩分析\n" +
  "本章描述了实验设计和数据收集过程，并对结果进行了全面的验证和讨论。";

/** 0.01 CJK — one technical term. Must fall through to stopwords. */
const EN_WITH_STRAY_CJK =
  "The quarterly report describes the financial results for the period and " +
  "includes a detailed breakdown of revenue by segment. Management believes " +
  "that these figures are consistent with prior guidance which was issued at " +
  "the start of the year. The term 测试 appears once in the appendix as a " +
  "technical reference and should not be considered material to the analysis.";

/** 0.03 CJK — a short pull-quote. The adversarial direction. */
const EN_WITH_CJK_QUOTE =
  "The quarterly report describes the financial results for the period and " +
  "includes a detailed breakdown of revenue by segment. Management believes " +
  "that these figures are consistent with prior guidance which was issued at " +
  "the start of the year, and that the outlook remains unchanged. A " +
  "translated note reads 这是一个测试文件 in the appendix for reference.";

const HI_SAMPLE =
  "यह एक परीक्षण दस्तावेज़ है। इस रिपोर्ट में कई अध्याय हैं और हर अध्याय में " +
  "विस्तृत जानकारी दी गई है। हमारे अध्ययन से पता चलता है कि यह तरीका " +
  "व्यावहारिक रूप से बहुत प्रभावी है।";

/**
 * STOPWORDS is module-private, so its Hindi entry is asserted from the source
 * text rather than by exporting internals just for a test.
 */
async function hasHindiStopwords(): Promise<boolean> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const src = await fs.readFile(
    path.join(
      path.dirname(new URL(import.meta.url).pathname),
      "..",
      "src",
      "lib",
      "pdf",
      "ocrLang.ts"
    ),
    "utf-8"
  );
  return /^\s*hin:\s*\[/m.test(src);
}

// ─── OCR_LANGS ──────────────────────────────────────────────────────────────

describe("OCR_LANGS", () => {
  test("every entry has a non-empty code and label", () => {
    for (const entry of OCR_LANGS) {
      assert.ok(entry.code.length > 0, `code is non-empty`);
      assert.ok(entry.label.length > 0, `label is non-empty`);
      assert.ok(Array.isArray(entry.bcp47), `bcp47 is an array`);
    }
  });

  /**
   * chi_tra is the one deliberate empty-bcp47 entry: `zh` alone cannot say
   * which variant a document uses, so only chi_sim claims it and chi_tra is
   * reached via normalizeLang's FULL_TAG_ALIASES or the picker. Everything
   * else must stay directly reachable from a bare primary subtag.
   */
  test("only chi_tra has an empty bcp47 list", () => {
    for (const entry of OCR_LANGS) {
      if (entry.code === "chi_tra") {
        assert.equal(entry.bcp47.length, 0, "chi_tra must not claim a subtag");
      } else {
        assert.ok(entry.bcp47.length > 0, `${entry.code} needs a bcp47 prefix`);
      }
    }
  });

  test("codes are unique", () => {
    const codes = OCR_LANGS.map((l) => l.code);
    assert.equal(codes.length, new Set(codes).size, "duplicate code found");
  });

  /**
   * Two entries claiming the same primary subtag would make normalizeLang's
   * `find` resolve by array order — a silent, order-dependent bug that would
   * only surface as the wrong OCR model being fetched.
   */
  test("no two entries claim the same bcp47 subtag", () => {
    const seen = new Map<string, string>();
    for (const entry of OCR_LANGS) {
      for (const tag of entry.bcp47) {
        const prior = seen.get(tag);
        assert.equal(
          prior,
          undefined,
          `"${tag}" claimed by both ${prior} and ${entry.code}`
        );
        seen.set(tag, entry.code);
      }
    }
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
    assert.equal(normalizeLang("ja"), null);
    assert.equal(normalizeLang("ko"), null);
    assert.equal(normalizeLang("ar"), null);
  });

  test("maps Hindi", () => {
    assert.equal(normalizeLang("hi"), "hin");
    assert.equal(normalizeLang("hi-IN"), "hin");
  });

  /**
   * Chinese is the only tag where the script/region subtag picks the model,
   * so the primary-subtag shortcut alone would silently conflate Taiwan with
   * the Mainland and fetch the wrong traineddata.
   */
  test("resolves Chinese variants from the script/region subtag", () => {
    assert.equal(normalizeLang("zh-Hant"), "chi_tra");
    assert.equal(normalizeLang("zh-TW"), "chi_tra");
    assert.equal(normalizeLang("zh-HK"), "chi_tra");
    assert.equal(normalizeLang("zh-MO"), "chi_tra");
    assert.equal(normalizeLang("zh-Hans"), "chi_sim");
    assert.equal(normalizeLang("zh-CN"), "chi_sim");
    assert.equal(normalizeLang("zh-SG"), "chi_sim");
  });

  test("bare zh falls back to Simplified", () => {
    assert.equal(normalizeLang("zh"), "chi_sim");
  });

  test("Chinese aliases survive case and underscore variation", () => {
    assert.equal(normalizeLang("zh_TW"), "chi_tra");
    assert.equal(normalizeLang("  ZH-tw  "), "chi_tra");
    assert.equal(normalizeLang("ZH-HANS"), "chi_sim");
  });

  test("an unknown zh region still resolves rather than failing", () => {
    // zh-XX is not in the alias map, so it falls through to the primary
    // subtag and lands on chi_sim — degraded, but never null.
    assert.equal(normalizeLang("zh-XX"), "chi_sim");
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

  test("returns null for Latin text shorter than 200 chars", () => {
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

  test("Hindi has a STOPWORDS entry as a fallback scorer", async () => {
    // Devanagari always trips the script check first, so this guards against
    // Hindi being left with no scorer if that check ever narrows.
    assert.ok(await hasHindiStopwords(), "hin needs a STOPWORDS entry");
  });
});

// ─── Script-range detection ─────────────────────────────────────────────────

/**
 * Chinese is written without spaces, so the stopword tokenizer yields whole
 * paragraphs as single tokens and could never reach a match. The script check
 * runs first for exactly that reason — and the ordering is load-bearing:
 * behind the token guard, CJK detection is dead code that no other test
 * notices.
 */
describe("sniffLangFromText: script detection", () => {
  test("detects pure Simplified Chinese", () => {
    assert.equal(sniffLangFromText(ZH_SIMPLIFIED), "chi_sim");
  });

  test("detects pure Traditional Chinese", () => {
    assert.equal(sniffLangFromText(ZH_TRADITIONAL), "chi_tra");
  });

  test("detects Hindi from the Devanagari range", () => {
    assert.equal(sniffLangFromText(HI_SAMPLE), "hin");
  });

  /**
   * The two rows that are the entire safety argument for the 0.2 threshold.
   * A Chinese document with English headers must resolve to Chinese; an
   * English document with a stray CJK term must NOT.
   */
  test("a Chinese doc with English headers resolves to Chinese", () => {
    assert.equal(sniffLangFromText(ZH_WITH_ENGLISH_HEADERS), "chi_sim");
  });

  test("an English doc with a stray CJK term falls through to stopwords", () => {
    assert.equal(sniffLangFromText(EN_WITH_STRAY_CJK), "eng");
  });

  test("an English doc with a short CJK quote still resolves to English", () => {
    assert.equal(sniffLangFromText(EN_WITH_CJK_QUOTE), "eng");
  });

  /**
   * The ordering test. A Chinese sample has far fewer than 20 whitespace
   * tokens, so if the script check ever moves below the token guard this is
   * the assertion that fails.
   */
  test("resolves Chinese despite having too few whitespace tokens", () => {
    const tokens = ZH_SIMPLIFIED.trim().split(/\s+/).filter((t) => t.length >= 2);
    assert.ok(
      tokens.length < 20,
      `sample must have <20 tokens to prove ordering, got ${tokens.length}`
    );
    assert.equal(sniffLangFromText(ZH_SIMPLIFIED), "chi_sim");
  });

  /**
   * CJK is information-dense: ~190 characters of Chinese is a full paragraph
   * and unambiguously Chinese, but sits under the 200-char stopword floor. A
   * shared floor made detection dead for exactly the short samples where it
   * is most reliable, so script detection has its own lower one.
   */
  test("detects Chinese below the 200-char stopword floor", () => {
    assert.ok(ZH_SIMPLIFIED.length < 200, "sample must be under the floor");
    assert.equal(sniffLangFromText(ZH_SIMPLIFIED), "chi_sim");
  });

  test("still returns null for a sample too short for any detection", () => {
    assert.equal(sniffLangFromText("测试"), null);
    assert.equal(sniffLangFromText("परीक्षण"), null);
  });

  test("Latin and Cyrillic detection is unchanged by the script check", () => {
    // Regression guard: the pre-check must not intercept the existing path.
    const en =
      "The committee has been working with the board to ensure that all " +
      "requirements have been met. They would like to confirm that the " +
      "proposal was reviewed and that the recommendations were accepted " +
      "by the full board for their records.";
    assert.equal(sniffLangFromText(en), "eng");
  });

  test("a punctuation-only CJK line is not classified as Chinese", () => {
    // CJK_CHAR excludes punctuation precisely so this cannot happen.
    const punct = "，、。".repeat(40);
    assert.equal(sniffLangFromText(punct), null);
  });

  test("fullwidth Latin is not classified as Chinese", () => {
    const fullwidth = "ＡＢＣＤＥＦ".repeat(20);
    assert.equal(sniffLangFromText(fullwidth), null);
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
    // "jpn" is a real tesseract code with no model installed — the case that
    // matters, since a shipped-looking code is what would 404 at recognize.
    const result = resolveOcrLang({ userLang: "jpn" });
    assert.equal(result.lang, "eng");
    assert.equal(result.source, "default");
  });

  test("user pick accepts the Chinese variants", () => {
    assert.equal(resolveOcrLang({ userLang: "chi_sim" }).source, "user");
    assert.equal(resolveOcrLang({ userLang: "chi_tra" }).lang, "chi_tra");
    assert.equal(resolveOcrLang({ userLang: "hin" }).lang, "hin");
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
    const result = resolveOcrLang({ docLang: "ja-JP" });
    assert.equal(result.lang, "eng");
    assert.equal(result.source, "default");
  });

  test("metadata resolves Chinese variants", () => {
    const tra = resolveOcrLang({ docLang: "zh-TW" });
    assert.equal(tra.lang, "chi_tra");
    assert.equal(tra.source, "metadata");
    assert.equal(resolveOcrLang({ docLang: "zh-CN" }).lang, "chi_sim");
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

  test("a Chinese text layer sniffs to Chinese, beating /Lang", () => {
    const result = resolveOcrLang({
      docLang: "en",
      textSample: ZH_SIMPLIFIED,
    });
    assert.equal(result.lang, "chi_sim");
    assert.equal(result.source, "sniff");
  });
});

// ─── Script ranges ──────────────────────────────────────────────────────────

/**
 * The two-tier range split is the correction that makes real Chinese work.
 * CJK_CHAR drives detection and the wholeWord bypass, so it must NOT match
 * punctuation — otherwise a line of bare "，、。" reads as Chinese and a
 * punctuation-only query silently takes the CJK bypass.
 */
describe("CJK_CHAR", () => {
  test("matches ideographs and kana", () => {
    assert.ok(CJK_CHAR.test("测试"));
    assert.ok(CJK_CHAR.test("測試"));
    assert.ok(CJK_CHAR.test("ひらがな"));
    assert.ok(CJK_CHAR.test("カタカナ"));
  });

  test("does NOT match CJK punctuation", () => {
    assert.equal(CJK_CHAR.test("，、。"), false);
    assert.equal(CJK_CHAR.test("　"), false); // ideographic space
  });

  test("does NOT match fullwidth alphanumerics", () => {
    assert.equal(CJK_CHAR.test("ＡＢＣ"), false);
    assert.equal(CJK_CHAR.test("１２３"), false);
    assert.equal(CJK_CHAR.test("ａｂｃ"), false);
  });

  test("does not match Latin, Cyrillic, or Devanagari", () => {
    assert.equal(CJK_CHAR.test("hello"), false);
    assert.equal(CJK_CHAR.test("проверка"), false);
    assert.equal(CJK_CHAR.test("परीक्षण"), false);
  });
});

describe("DEVANAGARI_CHAR", () => {
  test("matches Devanagari and nothing else in the shipped set", () => {
    assert.ok(DEVANAGARI_CHAR.test("परीक्षण"));
    assert.equal(DEVANAGARI_CHAR.test("hello"), false);
    assert.equal(DEVANAGARI_CHAR.test("测试"), false);
    assert.equal(DEVANAGARI_CHAR.test("проверка"), false);
  });
});

// ─── despaceCjk ─────────────────────────────────────────────────────────────

describe("despaceCjk", () => {
  test("removes spaces between ideographs", () => {
    assert.equal(despaceCjk("这 是 一 个 测 试"), "这是一个测试");
    assert.equal(despaceCjk("測 試 文 件"), "測試文件");
  });

  /**
   * The case a single-tier range got wrong. "、" (U+3001) and "，" (U+FF0C)
   * sit outside the ideograph blocks, so spaces around them survived and a
   * query spanning the comma could never match. Real OCR output is full of
   * both.
   */
  test("removes spaces around CJK punctuation", () => {
    assert.equal(despaceCjk("第 一 章 、 引 言"), "第一章、引言");
    assert.equal(despaceCjk("测 试 ， 结 果"), "测试，结果");
    assert.equal(despaceCjk("完 成 。"), "完成。");
  });

  test("collapses multi-space runs between ideographs", () => {
    assert.equal(despaceCjk("测   试"), "测试");
    assert.equal(despaceCjk("测\t试"), "测试");
  });

  /**
   * Taken verbatim from real output: recognizing the Traditional fixture with
   * chi_tra returned "本報告包含多個章節 ," — tesseract read the fullwidth "，"
   * as an ASCII comma, putting the space outside CJK_PUNCT's reach.
   */
  test("removes the space before ASCII punctuation that OCR substituted", () => {
    assert.equal(despaceCjk("本報告包含多個章節 ,"), "本報告包含多個章節,");
    assert.equal(despaceCjk("测试 ."), "测试.");
    assert.equal(despaceCjk("测试 ?"), "测试?");
    assert.equal(despaceCjk("测试 !"), "测试!");
    assert.equal(despaceCjk("测试 ;"), "测试;");
    assert.equal(despaceCjk("测试 :"), "测试:");
  });

  test("the ASCII-punctuation rule is one-directional", () => {
    // Latin on the left must never trigger it, or ordinary English breaks.
    assert.equal(despaceCjk("hello ,"), "hello ,");
    assert.equal(despaceCjk("Total: 100 USD"), "Total: 100 USD");
    assert.equal(despaceCjk("done ."), "done .");
  });

  test("ASCII letters and digits after an ideograph keep their space", () => {
    // Only sentence punctuation is glue; "报告 2024" is a real word boundary.
    assert.equal(despaceCjk("报告 2024"), "报告 2024");
    assert.equal(despaceCjk("中文 and"), "中文 and");
  });

  // The must-not-change rows. Despacing that reaches beyond CJK would corrupt
  // every other language's text on its way through the same code path.
  test("leaves ASCII digits adjacent to ideographs alone", () => {
    assert.equal(despaceCjk("报告 2024 年度"), "报告 2024 年度");
  });

  test("leaves Latin text untouched", () => {
    assert.equal(despaceCjk("hello world test"), "hello world test");
    assert.equal(despaceCjk("Total: 100 USD"), "Total: 100 USD");
  });

  test("leaves Devanagari untouched", () => {
    assert.equal(despaceCjk("यह एक परीक्षण"), "यह एक परीक्षण");
  });

  test("preserves the space at a script boundary", () => {
    assert.equal(despaceCjk("中文 and English"), "中文 and English");
    assert.equal(despaceCjk("English 中文"), "English 中文");
  });

  test("is a no-op on empty input", () => {
    assert.equal(despaceCjk(""), "");
  });

  /**
   * CJK_SPACE carries the `g` flag, so a shared lastIndex across calls would
   * make results depend on call order — the classic stateful-regex bug.
   */
  test("is stateless across repeated calls", () => {
    for (let i = 0; i < 3; i++) {
      assert.equal(despaceCjk("这 是 测 试"), "这是测试");
    }
  });
});

// ─── truncateGraphemes ──────────────────────────────────────────────────────

describe("truncateGraphemes", () => {
  test("returns the input unchanged when under the limit", () => {
    assert.equal(truncateGraphemes("short", 100), "short");
  });

  /**
   * "परीक्षण" is 7 code units but 4 graphemes, so slice(0, 5) yields "परीक्"
   * with an orphaned virama. sampleText reaches a human in an issue report,
   * so a mangled tail is a real (if cosmetic) defect.
   */
  test("does not orphan a Devanagari combining mark", () => {
    const out = truncateGraphemes("परीक्षण", 5);
    assert.ok(out.length <= 5);
    assert.equal(out, "परी");
  });

  test("does not split a surrogate pair", () => {
    const out = truncateGraphemes("👨‍👩‍👧emoji", 3);
    assert.ok(out.length <= 3);
    // Never a lone surrogate.
    assert.equal(/[\uD800-\uDFFF]$/.test(out), false);
  });

  test("truncates Latin text at the limit", () => {
    assert.equal(truncateGraphemes("abcdefghij", 4), "abcd");
  });

  test("never exceeds the requested length", () => {
    for (const s of ["परीक्षण दस्तावेज़", "测试文件", "plain ascii", "👍👍👍"]) {
      for (const max of [1, 2, 3, 5, 8]) {
        assert.ok(
          truncateGraphemes(s, max).length <= max,
          `"${s}" @ ${max} exceeded the cap`
        );
      }
    }
  });
});

// ─── buildSearchPattern ─────────────────────────────────────────────────────

describe("buildSearchPattern: Latin regression", () => {
  // These are the rows that prove the Unicode boundary did not change the
  // behavior every existing user already depends on.
  test("whole-word matches a standalone word", () => {
    assert.ok(matches("test", "this is a test here", { wholeWord: true }));
  });

  test("whole-word rejects the word as a prefix or infix", () => {
    assert.equal(matches("test", "testing the kit", { wholeWord: true }), false);
    assert.equal(matches("test", "untested code", { wholeWord: true }), false);
  });

  test("substring search still matches inside a word", () => {
    assert.ok(matches("test", "testing the kit"));
  });

  test("is case-insensitive by default and exact when asked", () => {
    assert.ok(matches("TEST", "a test here"));
    assert.equal(matches("TEST", "a test here", { caseSensitive: true }), false);
    assert.ok(matches("test", "a test here", { caseSensitive: true }));
  });

  test("whole-word honors punctuation as a boundary", () => {
    assert.ok(matches("test", "a test, and more", { wholeWord: true }));
    assert.ok(matches("test", "(test)", { wholeWord: true }));
    assert.ok(matches("test", "test", { wholeWord: true }));
  });

  test("digits count as word characters, not boundaries", () => {
    assert.equal(matches("test", "test123", { wholeWord: true }), false);
  });
});

/**
 * The `u` flag is stricter about escapes than an unflagged regex. escapeRegex
 * already escapes everything it objects to, but a regression here would take
 * out ordinary searches, so every punctuation class gets a row.
 */
describe("buildSearchPattern: u-flag regression", () => {
  const cases: Array<[string, string]> = [
    ["a.b", "value a.b here"],
    ["c*", "a c* marker"],
    ["$100", "costs $100 total"],
    ["50%", "up 50% today"],
    ["[bracket]", "a [bracket] here"],
    ["back\\slash", "a back\\slash here"],
    ["(paren)", "a (paren) here"],
    ["a+b", "a+b equals"],
    ["x?y", "x?y maybe"],
    ["{brace}", "a {brace} here"],
    ["a|b", "a|b choice"],
    ["^caret", "a ^caret here"],
    ["end$", "the end$ here"],
  ];

  for (const [query, line] of cases) {
    test(`compiles and matches literally: ${query}`, () => {
      const re = buildSearchPattern(query);
      assert.ok(re !== null, `${query} failed to compile`);
      assert.ok(re.test(line), `${query} did not match`);
    });
  }

  test("a literal query never behaves as a metacharacter", () => {
    // "a.b" must not match "axb" — proof the escape survived.
    assert.equal(matches("a.b", "axb"), false);
  });
});

/**
 * The bug this whole change set exists to fix. JS `\b` is ASCII-only
 * ([A-Za-z0-9_]), so whole-word search was silently broken in production for
 * Russian, which shipped in Stage 1.
 */
describe("buildSearchPattern: Cyrillic (the shipped bug)", () => {
  test("whole-word matches a Russian word", () => {
    assert.ok(matches("проверка", "это проверка текста", { wholeWord: true }));
  });

  test("whole-word rejects a Russian prefix", () => {
    assert.equal(
      matches("проверка", "проверкам текста", { wholeWord: true }),
      false
    );
  });

  test("Russian substring search is unaffected", () => {
    assert.ok(matches("провер", "проверкам текста"));
  });
});

describe("buildSearchPattern: Devanagari", () => {
  test("whole-word matches a Hindi word", () => {
    assert.ok(matches("परीक्षण", "यह एक परीक्षण है", { wholeWord: true }));
  });

  test("whole-word rejects a Hindi prefix", () => {
    assert.equal(
      matches("परीक्षण", "यह परीक्षणशाला है", { wholeWord: true }),
      false
    );
  });

  test("treats the danda as punctuation, not a letter", () => {
    // U+0964 ends a Hindi sentence, so a sentence-final word must still match.
    assert.ok(matches("परीक्षण", "यह एक परीक्षण।", { wholeWord: true }));
  });
});

/**
 * wholeWord is meaningless in a script with no word delimiters: "测试" inside
 * "这是一个测试文件" genuinely has letters on both sides. Applying a boundary
 * there means the query can never match, so it is bypassed instead.
 */
describe("buildSearchPattern: CJK bypass", () => {
  test("matches an embedded CJK query with wholeWord on", () => {
    assert.ok(matches("测试", "这是一个测试文件", { wholeWord: true }));
    assert.ok(matches("测试", "这是一个测试文件"));
  });

  test("matches a query spanning CJK punctuation after despacing", () => {
    const line = despaceCjk("第 一 章 、 引 言");
    assert.ok(matches("章、引", line, { wholeWord: true }));
  });

  test("a mixed CJK+Latin query also bypasses the boundary", () => {
    assert.ok(matches("测试A", "这是测试A文件", { wholeWord: true }));
  });

  test("Latin words in a mixed line still respect the boundary", () => {
    assert.ok(matches("and", "中文 and English", { wholeWord: true }));
    assert.equal(
      matches("and", "中文 android English", { wholeWord: true }),
      false
    );
  });
});

describe("buildSearchPattern: edge cases", () => {
  test("an empty query compiles to a pattern that matches anything", () => {
    // Matches today's behavior; callers guard on an empty query upstream.
    const re = buildSearchPattern("");
    assert.ok(re !== null);
  });

  test("returns a fresh regex each call (no shared lastIndex)", () => {
    const a = buildSearchPattern("test");
    const b = buildSearchPattern("test");
    assert.notEqual(a, b);
    assert.ok(a!.test("test"));
    assert.ok(b!.test("test"));
  });
});

/**
 * buildSearchPattern deliberately duplicates escapeRegex rather than importing
 * it, so ocrLang.ts stays dependency-free and the OCR worker bundle does not
 * pull in zod. This test is what makes the duplication safe.
 */
describe("escapeRegex duplication guard", () => {
  test("buildSearchPattern escapes exactly what escapeRegex does", () => {
    const specials = ".*+?^${}()|[]\\";
    for (const ch of specials) {
      const viaHelper = buildSearchPattern(ch);
      assert.ok(viaHelper !== null, `${ch} failed to compile via helper`);
      // The escaped form must match the literal character and nothing else.
      assert.ok(viaHelper.test(ch), `${ch} did not match itself`);
      // And escapeRegex must produce a pattern that agrees.
      const viaSecurity = new RegExp(escapeRegex(ch), "u");
      assert.ok(viaSecurity.test(ch), `escapeRegex(${ch}) did not match itself`);
    }
  });

  test("both escapers reject metacharacter interpretation identically", () => {
    for (const [query, nonMatch] of [
      [".", "x"],
      ["a.c", "abc"],
    ] as Array<[string, string]>) {
      assert.equal(matches(query, nonMatch), false, `${query} vs ${nonMatch}`);
      assert.equal(
        new RegExp(escapeRegex(query), "u").test(nonMatch),
        false,
        `escapeRegex ${query} vs ${nonMatch}`
      );
    }
  });
});

// ─── createHighlightedHtml ──────────────────────────────────────────────────

describe("createHighlightedHtml: the wholeWord bug", () => {
  /**
   * The second live bug. The highlighter took no wholeWord argument at all,
   * so a whole-word search for "test" correctly matched this line but marked
   * the "test" inside "testing" as well. Language-independent, shipping.
   */
  test("marks only true whole-word hits", () => {
    const html = createHighlightedHtml("test the testing kit", "test", false, true);
    assert.equal((html.match(/<mark>/g) ?? []).length, 1);
    assert.ok(html.includes("<mark>test</mark> the testing kit"));
  });

  test("marks every occurrence when wholeWord is off", () => {
    const html = createHighlightedHtml("test the testing kit", "test", false, false);
    assert.equal((html.match(/<mark>/g) ?? []).length, 2);
  });

  test("defaults to substring behavior when the arg is omitted", () => {
    const html = createHighlightedHtml("test the testing kit", "test", false);
    assert.equal((html.match(/<mark>/g) ?? []).length, 2);
  });

  test("highlights CJK despite wholeWord being on", () => {
    const html = createHighlightedHtml("这是一个测试文件", "测试", false, true);
    assert.ok(html.includes("<mark>测试</mark>"));
  });

  test("highlights Russian with wholeWord on", () => {
    const html = createHighlightedHtml("это проверка текста", "проверка", false, true);
    assert.ok(html.includes("<mark>проверка</mark>"));
  });

  test("highlights Hindi with wholeWord on", () => {
    const html = createHighlightedHtml("यह एक परीक्षण है", "परीक्षण", false, true);
    assert.ok(html.includes("<mark>परीक्षण</mark>"));
  });

  /**
   * escapeHtml runs BEFORE the regex is built, so the text being matched
   * contains "&amp;" / "&#039;". Reversing that order is the XSS bug the
   * function's own comment warns about, so the escaping must stay intact.
   */
  test("escapes HTML before matching", () => {
    const html = createHighlightedHtml("<script>alert(1)</script>", "alert", false);
    assert.equal(html.includes("<script>"), false);
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(html.includes("<mark>alert</mark>"));
  });

  test("a boundary still works next to an escaped entity", () => {
    // "&" escapes to "&amp;", whose characters must count as non-word so the
    // adjacent word still reads as whole.
    const html = createHighlightedHtml("Smith & Co test", "test", false, true);
    assert.ok(html.includes("<mark>test</mark>"));
    assert.ok(html.includes("&amp;"));
  });
});

/**
 * The test that keeps the two matchers honest. They drifted once already —
 * that is how the highlighter lost wholeWord — so parity is asserted across
 * every script rather than trusted.
 */
describe("matcher parity: searchPages vs the highlighter", () => {
  const lines = [
    "test the testing kit",
    "this is a test here",
    "untested code",
    "это проверка текста",
    "проверкам текста",
    "यह एक परीक्षण है",
    "यह परीक्षणशाला है",
    "这是一个测试文件",
    "中文 and English",
    "报告 2024 年度",
    "Total: 100 USD",
  ];
  const queries = ["test", "проверка", "परीक्षण", "测试", "and", "2024"];

  for (const wholeWord of [false, true]) {
    for (const caseSensitive of [false, true]) {
      test(`agree for wholeWord=${wholeWord} caseSensitive=${caseSensitive}`, () => {
        for (const query of queries) {
          for (const line of lines) {
            const matched = matches(query, line, { caseSensitive, wholeWord });
            const html = createHighlightedHtml(
              line,
              query,
              caseSensitive,
              wholeWord
            );
            const marked = html.includes("<mark>");
            assert.equal(
              marked,
              matched,
              `mismatch: query="${query}" line="${line}" ` +
                `wholeWord=${wholeWord} caseSensitive=${caseSensitive} ` +
                `(searchPages=${matched}, highlighter=${marked})`
            );
          }
        }
      });
    }
  }
});
