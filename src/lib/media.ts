// Photo constants shared by the browser (admin uploader, gallery) and the server.

export const ALBUMS = [
  { value: "vehicles", label: "Vehicles" },
  { value: "drivers", label: "Driver partners" },
  { value: "office", label: "Office & team" },
  { value: "events", label: "Events & launch" },
  { value: "other", label: "Around the city" },
] as const;
export type Album = (typeof ALBUMS)[number]["value"] | "news";
export const isAlbum = (v: string): v is Album => v === "news" || ALBUMS.some((a) => a.value === v);
export const albumLabel = (v: string) => ALBUMS.find((a) => a.value === v)?.label ?? "Photos";

export type Photo = { id: string; album: Album; caption: string; width: number; height: number; featured: boolean; sort: number; createdAt: Date; /** Service slug, when the photo belongs on a service page. */ service: string | null };

/** Limits after browser-side resizing (WebP, max 1600px / 640px). */
export const MAX_PHOTO_BYTES = 1_500_000;
export const MAX_THUMB_BYTES = 300_000;
export const PHOTO_TYPES = ["image/webp", "image/jpeg"];

export const photoUrl = (id: string, size: "full" | "thumb" = "full") => `/media/${id}${size === "thumb" ? "?s=thumb" : ""}`;

/** Photos for the home / About mosaics: the featured ones, or the latest if none are featured. */
export function pickFeatured(photos: Photo[], n = 6): Photo[] {
  const featured = photos.filter((p) => p.featured);
  return (featured.length ? featured : photos).slice(0, n);
}
