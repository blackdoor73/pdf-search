/**
 * Classifies client-side errors that are noise rather than signal.
 *
 * The admin "Recent errors" panel holds 15 rows. Left unfiltered it fills
 * with errors we can never act on — browser-extension crashes from a
 * visitor's wallet plugin, and cross-origin script errors the browser has
 * already stripped of every useful detail. Those crowd out real bugs.
 *
 * Deliberately conservative: when in doubt, keep the error. A missed real
 * bug costs far more than one noisy row.
 *
 * Pure and dependency-free so it is unit-testable under `node --test`.
 */

/** Extension protocols. An error here is from the visitor's browser, not us. */
const EXTENSION_PROTOCOLS = [
  "chrome-extension://",
  "moz-extension://",
  "safari-extension://",
  "safari-web-extension://",
  "webkit-masked-url://",
  "extensions::",
];

/**
 * Messages from injected third-party page scripts — overwhelmingly crypto
 * wallets (MetaMask and friends), which inject a `window.ethereum` provider
 * into every page and reject promises our global handler then catches.
 */
const NOISE_MESSAGE_PATTERNS = [
  /internal json-rpc error/i,
  /user rejected the request/i,
  /user denied (transaction|message)/i,
  /no ethereum provider/i,
  /ethereum is not defined/i,
  /window\.ethereum/i,
  /metamask/i,
  // Benign browser noise: fires on legitimate responsive layouts and is
  // explicitly harmless per the Resize Observer spec.
  /resizeobserver loop/i,
];

export interface ErrorSample {
  message?: string | null;
  /** ErrorEvent.filename, or the rejection's source marker. */
  filename?: string | null;
}

/**
 * True when the error carries no actionable information about *our* code.
 */
export function isNoiseError({ message, filename }: ErrorSample): boolean {
  const msg = (message ?? "").trim();
  const file = (filename ?? "").trim();

  if (EXTENSION_PROTOCOLS.some((p) => file.startsWith(p))) return true;
  if (NOISE_MESSAGE_PATTERNS.some((re) => re.test(msg))) return true;

  // "Script error." is what the browser reports when a cross-origin script
  // throws without CORS headers — message, file, and line are all stripped,
  // so the row can never be diagnosed. Only treat it as noise when there is
  // genuinely no location: a "Script error." that somehow kept its filename
  // is still worth keeping.
  if (/^script error\.?$/i.test(msg) && !file) return true;

  return false;
}
