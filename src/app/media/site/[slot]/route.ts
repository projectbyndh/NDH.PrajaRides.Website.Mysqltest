import { readSiteImage } from "@/lib/site-image-store";
import { SITE_IMAGE_SLOTS } from "@/lib/site-images";

// The website's own images from object storage (see src/lib/site-images.ts).
//   /media/site/<slot>            large image
//   /media/site/<slot>?s=thumb    thumbnail
// Admins can replace a slot at any time, so caches keep it for 15 minutes, then check again.
export async function GET(request: Request, { params }: RouteContext<"/media/site/[slot]">) {
  const { slot } = await params;
  if (!/^[a-z0-9-]{2,80}$/.test(slot)) return new Response("Not found", { status: 404 });
  const size = new URL(request.url).searchParams.get("s") === "thumb" ? "thumb" : "full";
  const image = await readSiteImage(slot, size).catch((err) => {
    console.error("[media/site]", err);
    return null;
  });
  if (!image) {
    // Slots with a built-in file (the logo) show that until an image is uploaded
    const fallback = SITE_IMAGE_SLOTS.find((s) => s.slot === slot)?.fallback;
    if (fallback && size === "full") return Response.redirect(new URL(fallback, request.url), 307);
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=900, s-maxage=900, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
