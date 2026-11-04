// Server-side checks for uploaded images (used by the admin gallery and the driver application).

/** The real type of an image, from its first bytes (not the file name): WebP or JPEG only. */
export function sniffImage(buf: Buffer): string | null {
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  return null;
}

export const validImageSize = (width: number, height: number) =>
  Number.isInteger(width) && Number.isInteger(height) && width >= 1 && height >= 1 && width <= 4000 && height <= 4000;
