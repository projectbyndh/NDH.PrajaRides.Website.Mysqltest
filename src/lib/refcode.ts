// Referral codes: 8 characters from an alphabet without look-alikes (no 0/O, 1/I/L).
// 31^8 ≈ 850 billion combinations, so codes can't be guessed or "edited" into another driver's.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const REF_CODE_LENGTH = 8;

export function generateRefCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(REF_CODE_LENGTH * 2));
  let out = "";
  for (const b of bytes) {
    if (b >= 248) continue; // 248 = 31 × 8: keeps the distribution uniform
    out += ALPHABET[b % ALPHABET.length];
    if (out.length === REF_CODE_LENGTH) return out;
  }
  return generateRefCode();
}

export const isRefCode = (v: string) => new RegExp(`^[${ALPHABET}]{${REF_CODE_LENGTH}}$`).test(v);

/** A first name as a link segment: "Ram Bahadur" → "ram", "Sita" → "sita". "driver" if nothing usable. */
export function nameSlug(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  const slug = first.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "driver";
}

/**
 * A driver's public referral link (path only): /ride/ram/K7QM2XPA with their first name and code.
 * Drivers without a code (older records) keep the legacy /r/DRV101.
 */
export const referralLink = (driver: { id: string; refCode?: string | null; name?: string | null }) =>
  driver.refCode ? `/ride/${nameSlug(driver.name)}/${encodeURIComponent(driver.refCode)}` : `/r/${encodeURIComponent(driver.id)}`;

/** Path used in links and QR codes: the secure code when the driver has one, else the legacy ID. */
export const referralPath = (driver: { id: string; refCode?: string | null }) => encodeURIComponent(driver.refCode ?? driver.id);
