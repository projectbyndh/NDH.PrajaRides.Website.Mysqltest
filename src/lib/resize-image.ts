// Browser-only: shrinks a photo before upload (phones produce 4–12 MB images).
// Output is WebP where the browser can encode it, otherwise JPEG.

async function encode(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  let blob = await toBlob("image/webp");
  // Older Safari can't encode WebP and silently returns PNG.
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  if (!blob) throw new Error("Couldn't process this image");
  return { blob, width, height };
}

export async function resizeForUpload(file: File): Promise<{ full: Blob; thumb: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This browser can't open this file. Use a JPG or PNG photo.");
  }
  try {
    let full = await encode(bitmap, 1600, 0.82);
    if (full.blob.size > 1_400_000) full = await encode(bitmap, 1400, 0.7);
    const thumb = await encode(bitmap, 640, 0.75);
    return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
  } finally {
    bitmap.close();
  }
}

/** Smaller copies for the driver application (several photos go up in one request). */
export async function resizeForApplication(file: File): Promise<{ full: Blob; thumb: Blob; width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This browser can't open this file. Use a JPG or PNG photo.");
  }
  try {
    let full = await encode(bitmap, 1280, 0.75);
    if (full.blob.size > 600_000) full = await encode(bitmap, 1024, 0.65);
    const thumb = await encode(bitmap, 400, 0.7);
    return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
  } finally {
    bitmap.close();
  }
}
