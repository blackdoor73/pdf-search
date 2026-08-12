/**
 * OCR language resolution.
 *
 * Pure and dependency-free so it is unit-testable under `node --test`.
 * Same shape as ocrLimits.ts: exported consts, classifiers returning
 * union types, a priority resolver.
 *
 * The shipped language set must match scripts/copy-tesseract-assets.mjs
 * exactly — a drift means a 404 at recognize time on one language only,
 * the worst way to find out. tests/ocrLang.test.ts enforces the match.
 */

// ─── Script ranges ───────────────────────────────────────────────────────────

/**
 * Two tiers, deliberately. Getting these confused is a silent correctness bug,
 * so they are named for their job rather than their contents.
 *
 * CJK_CORE — ideographs and kana only. Used for DETECTION and for the
 * `wholeWord` bypass decision. Must NOT include punctuation: a line of bare
 * "，、。" would otherwise be classified as Chinese, and a punctuation-only
 * query would take the CJK bypass.
 *
 * CJK_PUNCT — CJK/fullwidth punctuation, used ONLY for despacing. Tesseract
 * emits spaces around these too ("第 一 章 、 引 言"), so a range without them
 * leaves "第一章 、 引言" and a query spanning the comma never matches.
 * Deliberately stops short of fullwidth alphanumerics (Ａ-Ｚ ａ-ｚ ０-９,
 * U+FF21-FF3A / U+FF41-FF5A / U+FF10-FF19) — those are letters, not glue.
 */
const CJK_CORE = "\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF\\u3040-\\u30FF";
const CJK_PUNCT = "\\u3000-\\u303F\\uFF01-\\uFF20\\uFF3B-\\uFF40\\uFF5B-\\uFF65";

/**
 * ASCII punctuation that tesseract substitutes for its fullwidth CJK
 * equivalent. Observed, not hypothesized: recognizing zht_scan.pdf with
 * chi_tra returned "本報告包含多個章節 ," — an ASCII comma (U+002C) where the
 * page showed "，" (U+FF0C), leaving a space CJK_PUNCT could not reach.
 *
 * Only trailing sentence punctuation is listed. A space before one of these is
 * never meaningful after an ideograph, whereas ASCII letters and digits after
 * one legitimately keep their space ("报告 2024 年度"), so those stay out.
 */
const ASCII_CJK_PUNCT = ",.;:!?";

/** True when a string contains at least one CJK ideograph or kana. */
export const CJK_CHAR = new RegExp(`[${CJK_CORE}]`, "u");

/**
 * Matches whitespace sitting between two CJK characters (punctuation
 * included), for removal. Stateful (`g`) — callers use it with `.replace()`,
 * never `.test()`.
 */
export const CJK_SPACE = new RegExp(
  `(?<=[${CJK_CORE}${CJK_PUNCT}])\\s+(?=[${CJK_CORE}${CJK_PUNCT}])`,
  "gu"
);

/**
 * Whitespace between a CJK character and ASCII sentence punctuation, for
 * removal. Kept separate from CJK_SPACE because it is one-directional: the
 * CJK side must come first, so "Total: 100 USD" and "hello , world" are
 * untouched.
 */
export const CJK_ASCII_PUNCT_SPACE = new RegExp(
  `(?<=[${CJK_CORE}${CJK_PUNCT}])\\s+(?=[${ASCII_CJK_PUNCT}])`,
  "gu"
);

/** Devanagari block, for script detection. */
export const DEVANAGARI_CHAR = /[ऀ-ॿ]/u;

/**
 * Collapses tesseract's inter-ideograph spacing so stored text, displayed
 * text, and highlight offsets are all the same string.
 *
 * Only fires strictly between two CJK characters, so Latin, Devanagari, and
 * ASCII digits adjacent to ideographs are untouched ("报告 2024 年度" keeps
 * both spaces around the year). The one exception is ASCII sentence
 * punctuation directly after a CJK character, which tesseract produces when it
 * misreads a fullwidth mark as its ASCII twin.
 */
export function despaceCjk(s: string): string {
  return s.replace(CJK_SPACE, "").replace(CJK_ASCII_PUNCT_SPACE, "");
}

/**
 * Truncates without splitting a grapheme cluster.
 *
 * Devanagari makes plain `.slice()` visibly wrong: "परीक्षण" is 7 code units
 * but only 4 graphemes, so slice(0, 5) yields "परीक्" with an orphaned virama.
 * The same applies to emoji and any combining mark.
 *
 * Used for sampleText, which a human reads in an issue report. Falls back to
 * a code-point-safe slice where Intl.Segmenter is unavailable — still better
 * than cutting mid-surrogate.
 */
export function truncateGraphemes(s: string, max: number): string {
  if (s.length <= max) return s;
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    let out = "";
    for (const { segment } of seg.segment(s)) {
      if (out.length + segment.length > max) break;
      out += segment;
    }
    return out;
  }
  return Array.from(s).slice(0, max).join("").slice(0, max);
}

// ─── Search pattern construction ─────────────────────────────────────────────

/**
 * Builds the query regex used by BOTH matchers — engine.ts's searchPages and
 * security.ts's createHighlightedHtml.
 *
 * This exists because the two used to build their own regexes independently,
 * and drifted: the highlighter never implemented `wholeWord` at all, so a
 * whole-word search for "test" correctly skipped a line containing only
 * "testing" but still marked the "test" inside "testing" on lines it did
 * match. One helper makes that class of bug unrepresentable.
 *
 * Two deliberate choices:
 *
 * 1. The boundary is a Unicode lookaround, not `\b`. JS's `\b` is ASCII-only
 *    ([A-Za-z0-9_]), so it never matched around Cyrillic, Devanagari, or CJK —
 *    whole-word search was silently broken for Russian in production.
 *
 * 2. `wholeWord` is IGNORED for CJK queries. Chinese has no word delimiters,
 *    so "测试" inside "这是一个测试文件" genuinely has letters on both sides;
 *    applying a boundary there means the query can never match anything.
 *
 * Returns null when the query cannot compile, letting callers fail soft the
 * way searchPages already did.
 */
export function buildSearchPattern(
  query: string,
  opts: { caseSensitive?: boolean; wholeWord?: boolean } = {}
): RegExp | null {
  // Intentionally duplicates escapeRegex() from lib/security rather than
  // importing it: this module is dependency-free so the OCR worker can use
  // despaceCjk without pulling zod (a security/index.ts import) into the
  // worker bundle. tests/ocrLang.test.ts asserts the two stay identical.
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // A CJK query gets no boundary: there is nothing to bound against.
  const applyBoundary = Boolean(opts.wholeWord) && !CJK_CHAR.test(query);
  const body = applyBoundary
    ? `(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`
    : escaped;
  try {
    return new RegExp(body, (opts.caseSensitive ? "g" : "gi") + "u");
  } catch {
    return null;
  }
}

// ─── Shipped language set ────────────────────────────────────────────────────

export interface OcrLangEntry {
  /** Tesseract language code, e.g. "deu". */
  code: string;
  /** Human-readable label for the UI dropdown. */
  label: string;
  /** BCP-47 primary subtags matched against the PDF /Lang catalog entry. */
  bcp47: string[];
}

/**
 * Languages shipped in public/tesseract/lang/ via the copy script.
 *
 * Adding a language here requires:
 * 1. `npm i @tesseract.js-data/<code>@1.0.0 --save-exact`
 * 2. A matching entry in scripts/copy-tesseract-assets.mjs's LANG_ASSETS
 * 3. Verify the package has a `4.0.0_best_int/` directory
 *
 * Chinese and Hindi are supported. The blocker used to be the search layer,
 * not the language data: tesseract emits spaces between ideographs, and the
 * ASCII-only `\b` boundary never matched non-Latin scripts. Both are fixed
 * (despaceCjk and buildSearchPattern above). Japanese and Korean remain
 * unshipped simply because no model is installed.
 *
 * Only `chi_sim` claims the bare `zh` subtag. Two entries claiming it would
 * make normalizeLang's `find` resolve by array order — a silent,
 * order-dependent bug. `chi_tra` is reached via FULL_TAG_ALIASES and the
 * picker instead.
 */
export const OCR_LANGS: readonly OcrLangEntry[] = [
  { code: "eng", label: "English", bcp47: ["en"] },
  { code: "spa", label: "Spanish", bcp47: ["es"] },
  { code: "fra", label: "French", bcp47: ["fr"] },
  { code: "deu", label: "German", bcp47: ["de"] },
  { code: "ita", label: "Italian", bcp47: ["it"] },
  { code: "por", label: "Portuguese", bcp47: ["pt"] },
  { code: "rus", label: "Russian", bcp47: ["ru"] },
  { code: "hin", label: "Hindi", bcp47: ["hi"] },
  { code: "chi_sim", label: "Chinese (Simplified)", bcp47: ["zh"] },
  { code: "chi_tra", label: "Chinese (Traditional)", bcp47: [] },
] as const;

/** The set of valid tesseract codes, for O(1) lookups. */
const VALID_CODES = new Set(OCR_LANGS.map((l) => l.code));

export const OCR_DEFAULT_LANG = "eng";

// ─── Language resolution ─────────────────────────────────────────────────────

export type LangSource = "user" | "sniff" | "metadata" | "default";

export interface LangResolution {
  lang: string;
  source: LangSource;
}

/**
 * Tags whose script/region subtag changes which model to use, so the
 * primary-subtag shortcut below would lose the distinction.
 *
 * Chinese is the only such case in the shipped set: `zh-Hant`, `zh-TW`,
 * `zh-HK` and `zh-MO` are Traditional, while `zh-Hans`, `zh-CN` and `zh-SG`
 * are Simplified — and all seven reduce to `zh`. Keys are fully lowercased.
 */
const FULL_TAG_ALIASES: Record<string, string> = {
  "zh-hant": "chi_tra",
  "zh-tw": "chi_tra",
  "zh-hk": "chi_tra",
  "zh-mo": "chi_tra",
  "zh-hans": "chi_sim",
  "zh-cn": "chi_sim",
  "zh-sg": "chi_sim",
};

/**
 * Normalize a BCP-47 tag (e.g. `de-DE`, `pt-BR`) to the shipped tesseract
 * code, or null if not in the shipped set.
 *
 * Two passes. The full lowercased tag is checked against FULL_TAG_ALIASES
 * first, because for Chinese the region/script subtag is what picks the model.
 * Everything else falls through to the primary subtag, which handles the
 * common PDF /Lang formats (`de`, `de-DE`, `de-AT`) unchanged.
 *
 * Bare `zh` has no region to consult and lands on chi_sim via OCR_LANGS,
 * matching the sniffer's tie-break.
 */
export function normalizeLang(bcp47: string | undefined): string | null {
  if (!bcp47 || typeof bcp47 !== "string") return null;
  // PDF /Lang uses `-`, but `_` shows up in the wild; normalize both.
  const full = bcp47.trim().toLowerCase().replace(/_/g, "-");
  if (!full) return null;
  const aliased = FULL_TAG_ALIASES[full];
  if (aliased) return aliased;
  const primary = full.split("-")[0];
  if (!primary) return null;
  const entry = OCR_LANGS.find((l) => l.bcp47.includes(primary));
  return entry?.code ?? null;
}

// ─── Text-based language sniffing ────────────────────────────────────────────

/**
 * Per-language stopwords: short, high-frequency function words that are
 * distinctive enough to score against. Only words that are unambiguous
 * across the shipped set — "in" appears in English, Italian, and German.
 *
 * Keep this small and focused: the goal is to distinguish languages with
 * ≥80% accuracy on 2000+ chars of real text, not build an NLP pipeline.
 * The scoring is purely additive (count of matched stopwords), and the
 * winner must lead by at least 2 to claim confidence.
 */
const STOPWORDS: Record<string, string[]> = {
  eng: ["the", "and", "that", "this", "with", "for", "are", "was", "were", "been", "have", "from", "they", "which", "would", "could", "should", "your", "their"],
  spa: ["que", "los", "las", "del", "por", "una", "con", "para", "como", "pero", "este", "esta", "estos", "estas", "tiene", "puede", "desde", "sobre", "entre"],
  fra: ["les", "des", "une", "est", "pour", "dans", "par", "sur", "avec", "sont", "pas", "qui", "que", "cette", "nous", "vous", "leur", "mais", "tout", "aux"],
  deu: ["und", "der", "die", "das", "ist", "ein", "eine", "den", "dem", "nicht", "sich", "von", "auf", "wird", "auch", "nach", "werden", "aus", "kann", "nur"],
  ita: ["che", "del", "per", "una", "con", "sono", "gli", "dei", "nel", "alla", "della", "delle", "degli", "questo", "questa", "anche", "essere", "stato", "hanno", "fatto"],
  por: ["que", "uma", "dos", "das", "com", "para", "por", "como", "mais", "foi", "tem", "ser", "pelo", "pela", "pelos", "aos", "sua", "suas", "nos", "nos"],
  rus: ["это", "что", "как", "для", "при", "или", "его", "они", "все", "был", "она", "они", "без", "уже", "так", "ещё", "где", "быть", "есть", "между"],
  hin: ["और", "के", "है", "में", "को", "से", "का", "की", "पर", "यह", "हैं", "नहीं", "किया", "गया", "लिए", "साथ", "कोई", "अपने", "होता", "तथा"],
};

/**
 * Minimum share of non-whitespace characters in a script before that script
 * claims the document.
 *
 * 0.2 is not arbitrary: measured against a Chinese report with English
 * headers (0.29 CJK) and an English document containing one stray CJK term
 * (0.03). Those are the two cases that decide whether this heuristic is safe,
 * and the threshold sits cleanly between them. Below it, the stopword path
 * below runs completely unchanged.
 */
const SCRIPT_RATIO_MIN = 0.2;

/**
 * Minimum sample length for script detection, well below the 200 chars the
 * stopword scorer needs. A script is identifiable from far less text than a
 * vocabulary is — and CJK writes more content per character, so the stopword
 * floor would reject genuinely decisive Chinese samples. 60 is still long
 * enough that a stray heading cannot swing the ratio.
 */
const SCRIPT_SAMPLE_MIN = 60;

/**
 * Characters exclusive to one Chinese variant, for picking chi_sim vs chi_tra.
 *
 * Only characters that were actually simplified appear here — the large shared
 * middle of the script says nothing about which model to use. Counting is
 * symmetric and a tie (or no evidence at all) falls to chi_sim, matching
 * normalizeLang's treatment of bare `zh`.
 */
const SIMPLIFIED_ONLY = /[这个测试验证报数据国说话时间学习实现开发对头长风马鸟鱼门问题]/gu;
const TRADITIONAL_ONLY = /[這個測試驗證報數據國說話時間學習實現開發對頭長風馬鳥魚門問題]/gu;

function countMatches(text: string, re: RegExp): number {
  // Cloned so the shared `g`-flagged literal keeps no lastIndex between calls.
  return (text.match(new RegExp(re.source, re.flags)) ?? []).length;
}

/**
 * Identify a language from its script when the script alone is decisive.
 *
 * Runs BEFORE the stopword tokenizer, and that ordering is load-bearing:
 * Chinese is written without spaces, so whitespace tokenization yields whole
 * paragraphs as single tokens and the `tokens.length < 20` guard would return
 * null before any scoring happened. Placing this check after the guard makes
 * Chinese detection dead code that no other test notices.
 *
 * Returns null when no script clears SCRIPT_RATIO_MIN, letting the caller
 * fall through to stopwords. Hindi has its own STOPWORDS entry too — it uses
 * spaces, so the scorer works for it whenever the ratio check declines.
 */
function sniffScript(text: string): string | null {
  const dense = text.replace(/\s+/gu, "");
  if (dense.length === 0) return null;

  let cjk = 0;
  let deva = 0;
  for (const ch of dense) {
    if (CJK_CHAR.test(ch)) cjk++;
    else if (DEVANAGARI_CHAR.test(ch)) deva++;
  }

  const cjkRatio = cjk / dense.length;
  const devaRatio = deva / dense.length;

  // Both scripts over threshold is pathological; the denser one wins.
  if (cjkRatio >= SCRIPT_RATIO_MIN && cjkRatio >= devaRatio) {
    const sim = countMatches(text, SIMPLIFIED_ONLY);
    const tra = countMatches(text, TRADITIONAL_ONLY);
    return tra > sim ? "chi_tra" : "chi_sim";
  }
  if (devaRatio >= SCRIPT_RATIO_MIN) return "hin";
  return null;
}

/**
 * Attempt to identify the language from a text sample.
 *
 * Two stages: a script-range check for scripts that identify themselves
 * (CJK, Devanagari), then stopword frequency for the space-delimited Latin
 * and Cyrillic set. Returns the tesseract code of the winner, or null if
 * there is no clear one.
 *
 * The two stages have different length floors, deliberately. Stopword scoring
 * needs a lot of prose to find 20 tokens and a 2-word lead, hence 200 chars.
 * Script detection needs far less, and CJK is dense enough that the stopword
 * floor actively breaks it: 190 characters of Chinese is a full paragraph and
 * unambiguously Chinese, but would have been rejected before the script check
 * ever ran. A shared 200-char guard silently made CJK detection dead for
 * exactly the short samples where it is most reliable.
 */
export function sniffLangFromText(text: string): string | null {
  if (!text) return null;

  // Script check first — see sniffScript for why this cannot move below the
  // token guard, and the doc comment above for why it has its own floor.
  if (text.length >= SCRIPT_SAMPLE_MIN) {
    const byScript = sniffScript(text);
    if (byScript) return byScript;
  }

  if (text.length < 200) return null;

  // Lowercase, strip punctuation, tokenize on whitespace.
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  if (tokens.length < 20) return null;

  const tokenSet = new Set(tokens);

  const scores: Record<string, number> = {};
  for (const [lang, words] of Object.entries(STOPWORDS)) {
    scores[lang] = words.filter((w) => tokenSet.has(w)).length;
  }

  // Sort by score descending.
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0 || ranked[0][1] === 0) return null;

  // Require a lead of at least 2 over the runner-up.
  const [best, bestScore] = ranked[0];
  const runnerUpScore = ranked.length > 1 ? ranked[1][1] : 0;
  if (bestScore - runnerUpScore < 2) return null;

  return best;
}

// ─── Priority resolver ───────────────────────────────────────────────────────

/**
 * Resolve which language to use for OCR, following the priority ladder:
 *
 * 1. **User pick** — explicit selection from the UI dropdown. Always wins.
 * 2. **Text-layer sniff** — stopword scoring on pages that have text, for
 *    mixed docs where the text layer reveals the document's language at
 *    zero cost. This is the only automatic signal worth trusting.
 * 3. **PDF /Lang metadata** — from the catalog, via `getMetadata().info.Language`.
 *    Accurate when present, but frequently absent and sometimes wrong
 *    (scanners stamp defaults).
 * 4. **Default** — English.
 *
 * Accuracy claim, stated honestly: the picker works 100% of the time.
 * /Lang is right when it's right and often missing. The sniff is good on
 * mixed docs. A pure scan with no /Lang will silently use English unless
 * the user picks.
 */
export function resolveOcrLang(input: {
  userLang?: string;
  docLang?: string;
  textSample?: string;
}): LangResolution {
  // 1. User pick — must be a shipped code.
  if (input.userLang && VALID_CODES.has(input.userLang)) {
    return { lang: input.userLang, source: "user" };
  }

  // 2. Text-layer sniff — for mixed docs.
  if (input.textSample) {
    const sniffed = sniffLangFromText(input.textSample);
    if (sniffed) return { lang: sniffed, source: "sniff" };
  }

  // 3. PDF /Lang metadata — normalize BCP-47 to tesseract code.
  const fromMeta = normalizeLang(input.docLang);
  if (fromMeta) return { lang: fromMeta, source: "metadata" };

  // 4. Default.
  return { lang: OCR_DEFAULT_LANG, source: "default" };
}
