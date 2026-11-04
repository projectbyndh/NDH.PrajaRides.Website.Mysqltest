"use client";

import { resizeForUpload } from "@/lib/resize-image";
import { uploadPhotoAction } from "./actions";

/** Resizes one photo in the browser and uploads it. Returns the new photo id. */
export async function uploadPhoto(file: File, album: string, caption = ""): Promise<string> {
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) throw new Error(`${file.name} isn't an image.`);
  const { full, thumb, width, height } = await resizeForUpload(file);
  const fd = new FormData();
  fd.set("full", full, "full");
  fd.set("thumb", thumb, "thumb");
  fd.set("width", String(width));
  fd.set("height", String(height));
  fd.set("album", album);
  fd.set("caption", caption);
  const res = await uploadPhotoAction(fd);
  if (!res.ok) throw new Error(res.error);
  return res.id;
}
