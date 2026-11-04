import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "./db";
import { isSiteImageSlot } from "./site-images";
import { deleteObjects, extFor, getObject, putObject, storageKey } from "./storage";

// The website's own images (slots in site-images.ts): files in object storage, records in
// site_images. Read by /media/site/<slot>; replaced in admin → Website images.

export type StoredSiteImage = { slot: string; width: number; height: number; version: number; updatedAt: Date };

export async function listSiteImages(): Promise<StoredSiteImage[]> {
  const q = await sql();
  const rows = await q`SELECT slot, width, height, version, updated_at AS "updatedAt" FROM site_images ORDER BY slot`;
  return rows as unknown as StoredSiteImage[];
}

export async function readSiteImage(slot: string, size: "full" | "thumb"): Promise<{ mime: string; bytes: Buffer } | null> {
  if (!isSiteImageSlot(slot)) return null;
  const q = await sql();
  const [row] = await q`SELECT mime, storage_key, thumb_key FROM site_images WHERE slot = ${slot}`;
  if (!row) return null;
  const obj = await getObject(size === "thumb" ? (row.thumb_key ?? row.storage_key) : row.storage_key);
  return obj ? { mime: row.mime as string, bytes: obj.bytes } : null;
}

/** Puts a new file in a slot (upload first, then switch the record, then remove the old files). */
export async function replaceSiteImage(slot: string, img: { mime: string; data: Buffer; thumb: Buffer; width: number; height: number; alt?: string }): Promise<void> {
  if (!isSiteImageSlot(slot)) throw new Error(`Unknown slot ${slot}`);
  const q = await sql();
  const id = randomUUID();
  const ext = extFor(img.mime);
  const fullKey = storageKey(`site/${slot}/${id}.${ext}`);
  const thumbKey = storageKey(`site/${slot}/${id}-thumb.${ext}`);
  await Promise.all([putObject(fullKey, img.data, img.mime), putObject(thumbKey, img.thumb, img.mime)]);
  const [old] = await q`SELECT storage_key, thumb_key FROM site_images WHERE slot = ${slot}`;
  await q`
    INSERT INTO site_images (slot, storage_key, thumb_key, mime, width, height, alt)
    VALUES (${slot}, ${fullKey}, ${thumbKey}, ${img.mime}, ${img.width}, ${img.height}, ${img.alt ?? ""})
    ON CONFLICT (slot) DO UPDATE SET storage_key = EXCLUDED.storage_key, thumb_key = EXCLUDED.thumb_key, mime = EXCLUDED.mime,
      width = EXCLUDED.width, height = EXCLUDED.height, version = site_images.version + 1, updated_at = now()`;
  if (old) await deleteObjects([old.storage_key, old.thumb_key]);
}
