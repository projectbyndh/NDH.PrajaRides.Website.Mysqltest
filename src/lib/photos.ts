import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { randomUUID } from "node:crypto";
import { sql } from "./db";
import { deleteObjects, extFor, getObject, putObject, storageKey } from "./storage";
import type { Album, Photo } from "./media";

// Website photos: the gallery, plus covers for news posts (album 'news', not shown in the gallery).

export const PHOTOS_TAG = "photos";

const COLUMNS = `id, album, caption, width, height, featured, sort, created_at AS "createdAt", service`;

/** Gallery photos in display order, cached until the admin changes them. */
export async function getGalleryPhotos(): Promise<Photo[]> {
  "use cache";
  cacheTag(PHOTOS_TAG);
  cacheLife("days");
  try {
    const q = await sql();
    const rows = await q.unsafe(`SELECT ${COLUMNS} FROM photos WHERE album <> 'news' ORDER BY sort, created_at DESC`);
    return rows as unknown as Photo[];
  } catch (err) {
    console.error("[photos] gallery unavailable:", err);
    return [];
  }
}

/** Photos tagged with a service (admin → Gallery), for that service's page. */
export async function getServicePhotos(service: string): Promise<Photo[]> {
  "use cache";
  cacheTag(PHOTOS_TAG);
  cacheLife("days");
  try {
    const q = await sql();
    const rows = await q.unsafe(`SELECT ${COLUMNS} FROM photos WHERE service = $1 ORDER BY sort, created_at DESC LIMIT 12`, [service]);
    return rows as unknown as Photo[];
  } catch (err) {
    console.error("[photos] service photos unavailable:", err);
    return [];
  }
}

export async function listAllPhotos(): Promise<Photo[]> {
  const q = await sql();
  const rows = await q.unsafe(`SELECT ${COLUMNS} FROM photos WHERE album <> 'news' ORDER BY sort, created_at DESC`);
  return rows as unknown as Photo[];
}

export async function insertPhoto(p: { album: Album; caption: string; mime: string; data: Buffer; thumb: Buffer; width: number; height: number }): Promise<string> {
  const q = await sql();
  const id = randomUUID();
  const ext = extFor(p.mime);
  const fullKey = storageKey(`photos/${id}/full.${ext}`);
  const thumbKey = storageKey(`photos/${id}/thumb.${ext}`);
  await Promise.all([putObject(fullKey, p.data, p.mime), putObject(thumbKey, p.thumb, p.mime)]);
  try {
    // New photos go first: one below the current minimum sort.
    await q`
      INSERT INTO photos (id, album, caption, mime, storage_key, thumb_key, width, height, sort)
      VALUES (${id}, ${p.album}, ${p.caption}, ${p.mime}, ${fullKey}, ${thumbKey}, ${p.width}, ${p.height},
              (SELECT COALESCE(MIN(sort), 0) - 1 FROM photos))`;
  } catch (err) {
    await deleteObjects([fullKey, thumbKey]);
    throw err;
  }
  return id;
}

export async function updatePhoto(id: string, fields: { caption?: string; album?: Album; featured?: boolean; service?: string | null }): Promise<void> {
  const q = await sql();
  const set: Record<string, unknown> = {};
  if (fields.caption !== undefined) set.caption = fields.caption;
  if (fields.album !== undefined) set.album = fields.album;
  if (fields.featured !== undefined) set.featured = fields.featured;
  if (fields.service !== undefined) set.service = fields.service;
  if (!Object.keys(set).length) return;
  await q`UPDATE photos SET ${q(set)} WHERE id = ${id}`;
}

/** Saves a new order for the gallery (ids in display order). */
export async function reorderPhotos(ids: string[]): Promise<void> {
  const q = await sql();
  await q.begin(async (tx) => {
    for (const [i, id] of ids.entries()) await tx`UPDATE photos SET sort = ${i} WHERE id = ${id}`;
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const q = await sql();
  await q`UPDATE posts SET cover_id = NULL WHERE cover_id = ${id}`;
  const [row] = await q`DELETE FROM photos WHERE id = ${id} RETURNING storage_key, thumb_key`;
  if (row) await deleteObjects([row.storage_key, row.thumb_key]);
}

/** Image bytes for /media/<id>: from object storage, or (older rows) from the database. */
export async function readPhotoBytes(id: string, size: "full" | "thumb"): Promise<{ mime: string; bytes: Buffer } | null> {
  const q = await sql();
  const [row] = await q`SELECT mime, storage_key, thumb_key FROM photos WHERE id = ${id}`;
  if (!row) return null;
  const key = size === "thumb" ? (row.thumb_key ?? row.storage_key) : row.storage_key;
  if (key) {
    const obj = await getObject(key);
    return obj ? { mime: row.mime as string, bytes: obj.bytes } : null;
  }
  const [legacy] = size === "thumb" ? await q`SELECT thumb AS bytes FROM photos WHERE id = ${id}` : await q`SELECT data AS bytes FROM photos WHERE id = ${id}`;
  return legacy?.bytes ? { mime: row.mime as string, bytes: legacy.bytes as Buffer } : null;
}
