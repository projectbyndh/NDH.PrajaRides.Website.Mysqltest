"use server";

import { headers } from "next/headers";
import { submitApplication, type ApplicationPhotoInput, type PhotoKind } from "@/lib/applications";
import { sniffImage, validImageSize } from "@/lib/image-check";
import { APPLICATION_PHOTOS, validateApplication, type FieldErrors } from "@/lib/validation";

export type ApplyState = { done?: boolean; error?: string; fieldErrors?: FieldErrors; values?: Record<string, string> };

const ipOf = async () => (await headers()).get("x-forwarded-for")?.split(",")[0].trim().slice(0, 64) ?? null;

// Photos arrive already resized in the browser (see resizeForApplication), as parallel lists:
// photoKind[i], photoFull[i], photoThumb[i], photoWidth[i], photoHeight[i].
const MAX_FULL_BYTES = 700_000;
const MAX_THUMB_BYTES = 150_000;
const KINDS: PhotoKind[] = ["vehicle", "license"];

async function readPhotos(fd: FormData): Promise<{ photos: ApplicationPhotoInput[] } | { error: string; field: string }> {
  const kinds = fd.getAll("photoKind").map(String);
  const fulls = fd.getAll("photoFull");
  const thumbs = fd.getAll("photoThumb");
  const widths = fd.getAll("photoWidth").map(Number);
  const heights = fd.getAll("photoHeight").map(Number);
  if (kinds.length > APPLICATION_PHOTOS.vehicleMax + 1) return { error: "Too many photos.", field: "vehiclePhotos" };

  const photos: ApplicationPhotoInput[] = [];
  for (let i = 0; i < kinds.length; i++) {
    const kind = kinds[i] as PhotoKind;
    const full = fulls[i];
    const thumb = thumbs[i];
    const field = kind === "vehicle" ? "vehiclePhotos" : `${kind}Photo`;
    if (!KINDS.includes(kind) || !(full instanceof Blob) || !(thumb instanceof Blob)) return { error: "A photo didn't upload. Please add it again.", field };
    if (full.size > MAX_FULL_BYTES || thumb.size > MAX_THUMB_BYTES) return { error: "A photo is too large. Please use a smaller one.", field };
    const data = Buffer.from(await full.arrayBuffer());
    const small = Buffer.from(await thumb.arrayBuffer());
    const mime = sniffImage(data);
    if (!mime || sniffImage(small) !== mime || !validImageSize(widths[i], heights[i])) return { error: "Use JPG, PNG or HEIC photos.", field };
    photos.push({ kind, mime, data, thumb: small, width: widths[i], height: heights[i] });
  }

  const count = (k: PhotoKind) => photos.filter((p) => p.kind === k).length;
  if (count("vehicle") < APPLICATION_PHOTOS.vehicleMin) return { error: "Add at least one photo of your vehicle.", field: "vehiclePhotos" };
  if (count("vehicle") > APPLICATION_PHOTOS.vehicleMax) return { error: `Add up to ${APPLICATION_PHOTOS.vehicleMax} vehicle photos.`, field: "vehiclePhotos" };
  if (count("license") !== 1) return { error: "Add a photo of your driving license.", field: "licensePhoto" };
  return { photos };
}

export async function applyAction(_prev: ApplyState, formData: FormData): Promise<ApplyState> {
  // Honeypot: real people never see or fill this field.
  if (String(formData.get("website") ?? "")) return { done: true };

  const values: Record<string, string> = {};
  for (const [k, v] of formData) if (typeof v === "string" && !k.startsWith("$") && !k.startsWith("photo")) values[k] = v;

  const result = validateApplication(formData);
  const photos = await readPhotos(formData);
  if (!result.ok || "error" in photos) {
    const fieldErrors = { ...(result.ok ? {} : result.errors), ...("error" in photos ? { [photos.field]: photos.error } : {}) };
    return { error: "Please check the highlighted fields.", fieldErrors, values };
  }

  const saved = await submitApplication(result.data, await ipOf(), photos.photos);
  if (!saved.ok) return { error: saved.error, fieldErrors: saved.field ? { [saved.field]: saved.error } : undefined, values };
  return { done: true };
}
