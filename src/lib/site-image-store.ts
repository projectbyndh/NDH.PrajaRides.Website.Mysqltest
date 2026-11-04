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
  const rows = await q`SELECT slot, width, height, version, updated_at AS updatedAt FROM site_images ORDER BY slot`;
  return rows.map((r) => ({ ...r, width: Number(r.width), height: Number(r.height), version: Number(r.version) })) as unknown as StoredSiteImage[];
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
  // ON DUPLICATE KEY UPDATE reads the new row with VALUES(col) and the existing one by bare name,
  // which is how version keeps counting up from what is already stored.
  await q`
    INSERT INTO site_images (slot, storage_key, thumb_key, mime, width, height, alt)
    VALUES (${slot}, ${fullKey}, ${thumbKey}, ${img.mime}, ${img.width}, ${img.height}, ${img.alt ?? ""})
    ON DUPLICATE KEY UPDATE storage_key = VALUES(storage_key), thumb_key = VALUES(thumb_key), mime = VALUES(mime),
      width = VALUES(width), height = VALUES(height), version = version + 1, updated_at = UTC_TIMESTAMP()`;
  if (old) await deleteObjects([old.storage_key, old.thumb_key]);
}
