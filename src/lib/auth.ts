// Web Crypto only, so this works in the proxy as well as in server code.
export const ADMIN_COOKIE = "nepcab_admin";
export const DRIVER_COOKIE = "nepcab_driver";
export const DRIVER_SESSION_DAYS = 30;

const enc = new TextEncoder();

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Buffer.from(sig).toString("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// In production a missing, short or example secret (from .env.example) counts as not set, so a
// copied example file can't open the admin or sign driver cookies.
const EXAMPLE_SECRETS = new Set(["change-me", "a-long-random-string"]);
export function strongSecret(value: string | undefined): string | null {
  if (!value) return null;
  if (process.env.NODE_ENV === "production" && (value.length < 12 || EXAMPLE_SECRETS.has(value))) return null;
  return value;
}

// Admin: the cookie is an HMAC keyed by the password, so changing ADMIN_PASSWORD
// (or ADMIN_EMAIL) logs everyone out.
export async function adminToken(): Promise<string | null> {
  const password = strongSecret(process.env.ADMIN_PASSWORD);
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return password && email ? hmac(password, `nepcab-admin-v2:${email}`) : null;
}

export async function isValidAdminCookie(value: string | undefined): Promise<boolean> {
  const expected = await adminToken();
  return !!expected && !!value && safeEqual(value, expected);
}

// Driver: "<driverId>.<expiresAtSeconds>.<hmac>"
function driverSecret(): string | null {
  return strongSecret(process.env.SESSION_SECRET) ?? strongSecret(process.env.ADMIN_PASSWORD);
}

export async function createDriverToken(driverId: string): Promise<string> {
  const secret = driverSecret();
  if (!secret) throw new Error("SESSION_SECRET or ADMIN_PASSWORD must be set");
  const exp = Math.floor(Date.now() / 1000) + DRIVER_SESSION_DAYS * 86400;
  return `${driverId}.${exp}.${await hmac(secret, `driver:${driverId}:${exp}`)}`;
}

/** Returns the driver ID for a valid, unexpired token. */
export async function verifyDriverToken(token: string | undefined): Promise<string | null> {
  const secret = driverSecret();
  if (!secret || !token) return null;
  const [driverId, exp, sig] = token.split(".");
  if (!driverId || !exp || !sig || Number(exp) < Date.now() / 1000) return null;
  return safeEqual(sig, await hmac(secret, `driver:${driverId}:${exp}`)) ? driverId : null;
}
