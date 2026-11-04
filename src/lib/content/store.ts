import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sql } from "../db";
import { getSiteContent } from "../site-content";
import { SITE_IMAGE_SLOTS, type SiteImage } from "../site-images";
import { BLOCKS, type BlockData, type BlockKey } from "./blocks";

// Reads and saves page content blocks (content_blocks table). Reads are cached until an admin
// saves; the first read of a block on a new database stores its starting content.

export const CONTENT_TAG = "content";

const WHATSAPP_BOOKING = "Hello Praja Ride, I'd like to book a ride.\nPickup: \nDrop-off: \nTime: ";

/** Replaces {phone}, {tollFree}, {email}, {address}, {city}, {area}, {company}, {whatsapp} in every string. */
function fill<T>(value: T, tokens: Record<string, string>): T {
  if (typeof value === "string") return value.replace(/\{(\w+)\}/g, (m, k) => tokens[k] ?? m) as T;
  if (Array.isArray(value)) return value.map((v) => fill(v, tokens)) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fill(v, tokens)])) as T;
  return value;
}

/** Raw block data as stored (no placeholders filled): for the admin editor. */
export async function readBlock<K extends BlockKey>(key: K): Promise<BlockData<K>> {
  const def = BLOCKS[key];
  const q = await sql();
  const [row] = await q`SELECT data FROM content_blocks WHERE key = ${key}`;
  if (!row) {
    await q`INSERT INTO content_blocks (key, data) VALUES (${key}, ${q.json(def.defaults as never)}) ON CONFLICT (key) DO NOTHING`;
    return def.defaults as BlockData<K>;
  }
  // New fields added in code get their starting value
  return { ...(def.defaults as object), ...(row.data as object) } as BlockData<K>;
}

/** Block content for a public page, with placeholders filled (cached until an admin saves). */
export async function getBlock<K extends BlockKey>(key: K): Promise<BlockData<K>> {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("days");
  const { contact, social, company } = await getSiteContent();
  const tokens = {
    phone: contact.phone,
    tollFree: contact.tollFree,
    email: contact.email,
    address: contact.address,
    city: company.city,
    area: company.serviceArea,
    company: company.name,
    whatsapp: `https://wa.me/977${contact.phone}?text=${encodeURIComponent(WHATSAPP_BOOKING)}`,
    map: social.google || "/contact",
  };
  try {
    return fill(await readBlock(key), tokens);
  } catch (err) {
    console.error(`[content] ${key}: using starting content`, err);
    return fill(BLOCKS[key].defaults as BlockData<K>, tokens);
  }
}

export async function saveBlock(key: BlockKey, data: unknown): Promise<void> {
  const q = await sql();
  await q`
    INSERT INTO content_blocks (key, data, updated_at) VALUES (${key}, ${q.json(data as never)}, now())
    ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
}

// ---- Website images by slot (for image fields) ----

export type ImageChoice = { slot: string; label: string; alt: string };

/** Every website image an admin can pick (built-in slots plus ones added in admin). */
export async function getImageChoices(): Promise<ImageChoice[]> {
  "use cache";
  cacheTag(CONTENT_TAG);
  cacheLife("days");
  const builtIn = SITE_IMAGE_SLOTS.map((s) => ({ slot: s.slot, label: s.label, alt: s.alt }));
  try {
    const q = await sql();
    const rows = await q`SELECT slot, label, alt FROM site_images WHERE custom ORDER BY updated_at DESC`;
    return [...builtIn, ...rows.map((r) => ({ slot: r.slot as string, label: (r.label as string) || r.slot, alt: (r.alt as string) || "" }))];
  } catch {
    return builtIn;
  }
}

/** A website image by slot, ready for <Image>. */
export function siteImage(slot: string, choices: ImageChoice[]): SiteImage {
  const c = choices.find((x) => x.slot === slot);
  return { src: `/media/site/${slot}`, alt: c?.alt || c?.label || "" };
}
