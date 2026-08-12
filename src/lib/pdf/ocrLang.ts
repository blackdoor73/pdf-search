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
 * CJK is deliberately excluded: tesseract emits spaces between ideographs
 * that `toLines()` preserves and `searchPages` cannot match, so searching
 * Chinese / Japanese / Korean would silently return nothing.
 */
export const OCR_LANGS: readonly OcrLangEntry[] = [
  { code: "eng", label: "English", bcp47: ["en"] },
  { code: "spa", label: "Spanish", bcp47: ["es"] },
  { code: "fra", label: "French", bcp47: ["fr"] },
  { code: "deu", label: "German", bcp47: ["de"] },
  { code: "ita", label: "Italian", bcp47: ["it"] },
  { code: "por", label: "Portuguese", bcp47: ["pt"] },
  { code: "rus", label: "Russian", bcp47: ["ru"] },
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
 * Normalize a BCP-47 tag (e.g. `de-DE`, `pt-BR`) to the shipped tesseract
 * code, or null if not in the shipped set.
 *
 * Handles the common PDF /Lang formats: `de`, `de-DE`, `de-AT`. Lowercases
 * and splits on `-` to extract the primary subtag.
 */
export function normalizeLang(bcp47: string | undefined): string | null {
  if (!bcp47 || typeof bcp47 !== "string") return null;
  const primary = bcp47.trim().toLowerCase().split("-")[0].split("_")[0];
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
};

/**
 * Attempt to identify the language from a text sample by stopword frequency.
 *
 * Returns the tesseract code of the best-scoring language, or null if no
 * clear winner (the lead is less than 2 stopwords). Expects ≥200 chars to
 * be useful; shorter samples almost always return null.
 */
export function sniffLangFromText(text: string): string | null {
  if (!text || text.length < 200) return null;

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
