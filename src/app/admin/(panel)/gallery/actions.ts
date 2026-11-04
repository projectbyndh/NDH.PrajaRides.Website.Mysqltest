"use server";

import { invalidate } from "@/lib/invalidate";
import { refresh } from "next/cache";
import { sniffImage } from "@/lib/image-check";
import { isAlbum, MAX_PHOTO_BYTES, MAX_THUMB_BYTES, type Album } from "@/lib/media";
import { deletePhoto, insertPhoto, PHOTOS_TAG, reorderPhotos, updatePhoto } from "@/lib/photos";
import { POSTS_TAG } from "@/lib/posts";
import { readServices } from "@/lib/services";
import { requireAdmin } from "@/lib/session";

const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export type UploadResult = { ok: true; id: string } | { ok: false; error: string };

/** One photo, already resized in the browser: `full` (≤1600px) and `thumb` (≤640px). */
export async function uploadPhotoAction(fd: FormData): Promise<UploadResult> {
  await requireAdmin();
  const full = fd.get("full");
  const thumb = fd.get("thumb");
  // Uploaded parts arrive as Blob (not always File) on the server.
  if (!(full instanceof Blob) || !(thumb instanceof Blob)) return { ok: false, error: "No image received." };
  if (full.size > MAX_PHOTO_BYTES || thumb.size > MAX_THUMB_BYTES) return { ok: false, error: "This image is too large even after resizing." };
  const data = Buffer.from(await full.arrayBuffer());
  const small = Buffer.from(await thumb.arrayBuffer());
  const mime = sniffImage(data);
  if (!mime || sniffImage(small) !== mime) return { ok: false, error: "Only JPG, PNG, WebP or HEIC photos can be uploaded." };
  const width = Number(fd.get("width"));
  const height = Number(fd.get("height"));
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 4000 || height > 4000) return { ok: false, error: "Couldn't read the image size." };
  const albumRaw = String(fd.get("album") ?? "other");
  const album: Album = isAlbum(albumRaw) ? albumRaw : "other";
  const caption = String(fd.get("caption") ?? "").trim().slice(0, 140);

  const id = await insertPhoto({ album, caption, mime, data, thumb: small, width, height });
  if (album !== "news") {
    invalidate(PHOTOS_TAG);
    refresh();
  }
  return { ok: true, id };
}

export async function updatePhotoAction(id: string, fields: { caption?: string; album?: string; featured?: boolean; service?: string }): Promise<void> {
  await requireAdmin();
  if (!isId(id)) return;
  await updatePhoto(id, {
    caption: fields.caption?.trim().slice(0, 140),
    album: fields.album && isAlbum(fields.album) && fields.album !== "news" ? fields.album : undefined,
    featured: fields.featured,
    // "" clears the link; anything else must be a real service
    service: fields.service === undefined ? undefined : (await readServices()).find((s) => s.slug === fields.service)?.slug ?? null,
  });
  invalidate(PHOTOS_TAG);
  refresh();
}

export async function reorderPhotosAction(ids: string[]): Promise<void> {
  await requireAdmin();
  if (!Array.isArray(ids) || ids.length > 500 || !ids.every(isId)) return;
  await reorderPhotos(ids);
  invalidate(PHOTOS_TAG);
  refresh();
}

export async function deletePhotoAction(id: string): Promise<void> {
  await requireAdmin();
  if (!isId(id)) return;
  await deletePhoto(id);
  invalidate(PHOTOS_TAG);
  invalidate(POSTS_TAG);
  refresh();
}
