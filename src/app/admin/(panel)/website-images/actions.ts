"use server";

import { refresh } from "next/cache";
import { sniffImage, validImageSize } from "@/lib/image-check";
import { MAX_PHOTO_BYTES, MAX_THUMB_BYTES } from "@/lib/media";
import { requireAdmin } from "@/lib/session";
import { replaceSiteImage } from "@/lib/site-image-store";
import { isSiteImageSlot } from "@/lib/site-images";

/** Replaces one website image (already resized in the browser: `full` and `thumb`). */
export async function replaceSiteImageAction(fd: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const slot = String(fd.get("slot") ?? "");
  if (!isSiteImageSlot(slot)) return { ok: false, error: "Unknown image." };
  const full = fd.get("full");
  const thumb = fd.get("thumb");
  if (!(full instanceof Blob) || !(thumb instanceof Blob)) return { ok: false, error: "No image received." };
  if (full.size > MAX_PHOTO_BYTES || thumb.size > MAX_THUMB_BYTES) return { ok: false, error: "This image is too large even after resizing." };
  const data = Buffer.from(await full.arrayBuffer());
  const small = Buffer.from(await thumb.arrayBuffer());
  const mime = sniffImage(data);
  const width = Number(fd.get("width"));
  const height = Number(fd.get("height"));
  if (!mime || sniffImage(small) !== mime || !validImageSize(width, height)) return { ok: false, error: "Only JPG, PNG, WebP or HEIC photos can be uploaded." };
  try {
    await replaceSiteImage(slot, { mime, data, thumb: small, width, height });
  } catch (err) {
    console.error("[website-images]", err);
    return { ok: false, error: "Upload to storage failed. Please try again." };
  }
  refresh();
  return { ok: true };
}
