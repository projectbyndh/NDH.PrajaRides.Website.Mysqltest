import { readPhotoBytes } from "@/lib/photos";

// Website photo bytes. Photos never change after upload (edits create a new id), so they can be
// cached for a long time by browsers and the CDN.
//   /media/<id>            large image (max 1600px)
//   /media/<id>?s=thumb    thumbnail (max 640px)
export async function GET(request: Request, { params }: RouteContext<"/media/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const size = new URL(request.url).searchParams.get("s") === "thumb" ? "thumb" : "full";
  const photo = await readPhotoBytes(id, size);
  if (!photo) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
