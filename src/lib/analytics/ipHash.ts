/**
 * Privacy-preserving visitor IP hashing.
 *
 * The raw IP is never stored — events carry HMAC-SHA256(ip, secret),
 * truncated to 32 hex chars. Stable per visitor (supports unique/returning
 * counts and per-visitor history) but not reversible without the secret.
 *
 * Env: IP_HASH_SECRET (falls back to ADMIN_SESSION_SECRET, then
 * ADMIN_PASSWORD). Without any secret, hashing is disabled and NULL is
 * stored — anon_id still provides visitor identity.
 */

const encoder = new TextEncoder();

let _key: Promise<CryptoKey> | null = null;
let _keySecret: string | null = null;

function getSecret(): string | null {
  return (
    process.env.IP_HASH_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    null
  );
}

export async function hashIp(ip: string): Promise<string | null> {
  const secret = getSecret();
  if (!secret || !ip || ip === "unknown") return null;

  if (!_key || _keySecret !== secret) {
    _keySecret = secret;
    _key = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }
  const sig = await crypto.subtle.sign("HMAC", await _key, encoder.encode(ip));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
