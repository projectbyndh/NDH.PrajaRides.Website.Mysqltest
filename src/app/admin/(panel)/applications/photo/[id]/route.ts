import { cookies } from "next/headers";
import { readApplicationPhoto } from "@/lib/applications";
import { ADMIN_COOKIE, isValidAdminCookie } from "@/lib/auth";

// Photos sent with driver applications (vehicle, license, bluebook). Admins only, never cached
// publicly (these include identity documents); the admin's own browser keeps them for an hour,
// since a photo never changes and object storage is slow to read from.
//   /admin/applications/photo/<id>            large image
//   /admin/applications/photo/<id>?s=thumb    thumbnail
export async function GET(request: Request, { params }: RouteContext<"/admin/applications/photo/[id]">) {
  if (!(await isValidAdminCookie((await cookies()).get(ADMIN_COOKIE)?.value))) return new Response("Not found", { status: 404 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const size = new URL(request.url).searchParams.get("s") === "thumb" ? "thumb" : "full";
  const photo = await readApplicationPhoto(id, size);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: { "Content-Type": photo.mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
