/**
 * Admin session auth — HMAC-signed expiring cookie.
 *
 * Uses Web Crypto only, so it runs in both the Edge middleware and Node
 * route handlers. Token format: `<expiryEpochMs>.<hmacSHA256hex>`.
 *
 * Env:
 * - ADMIN_PASSWORD        required to enable the dashboard
 * - ADMIN_SESSION_SECRET  optional; falls back to ADMIN_PASSWORD
 */

export const ADMIN_COOKIE = "pdfsearch_admin";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const encoder = new TextEncoder();

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function getSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || null;
}

async function hmacHex(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_PASSWORD not configured");
  const exp = String(Date.now() + SESSION_TTL_MS);
  return `${exp}.${await hmacHex(exp, secret)}`;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  const secret = getSecret();
  if (!secret) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return timingSafeEqual(sig, await hmacHex(exp, secret));
}

/** Constant-time password check (hash both sides to equal length first). */
export async function verifyPassword(candidate: string): Promise<boolean> {
  const actual = process.env.ADMIN_PASSWORD;
  if (!actual) return false;
  const salt = getSecret() ?? "pdfsearch";
  const [a, b] = await Promise.all([
    hmacHex(candidate, salt),
    hmacHex(actual, salt),
  ]);
  return timingSafeEqual(a, b);
}
