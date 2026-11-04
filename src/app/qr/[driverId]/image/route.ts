import { GENERAL_QR } from "@/lib/config";
import { resolveReferral } from "@/lib/drivers";
import { qrImage } from "@/lib/qr-image";
import { referralLink, referralPath } from "@/lib/refcode";
import { siteUrl } from "@/lib/site";

// PNG of a driver's QR sticker.
// The path segment is a referral code (K7QM2XPA) or, for old stickers, a driver ID (DRV101).
//   /qr/K7QM2XPA/image             printable sticker (1200×1760)
//   /qr/DRV101/image?variant=og    1200×630 link preview for WhatsApp/Facebook
//   ?download=1                    save as a file instead of displaying
export async function GET(request: Request, { params }: RouteContext<"/qr/[driverId]/image">) {
  const { searchParams } = new URL(request.url);
  const variant = searchParams.get("variant") === "og" ? "og" : "sticker";
  const headers: Record<string, string> = {
    "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
  };
  const segment = decodeURIComponent((await params).driverId);

  // General NepCab QR: not tied to any driver; scans count as general visits.
  if (segment.toLowerCase() === GENERAL_QR) {
    if (searchParams.get("download")) headers["Content-Disposition"] = `attachment; filename="nepcab-qr.png"`;
    return qrImage(null, `${await siteUrl()}/r`, variant, headers);
  }

  const { driverId, driver } = await resolveReferral(segment);
  if (driverId === "DIRECT") return new Response("Not found", { status: 404 });
  const path = driver ? referralPath(driver) : encodeURIComponent(driverId);

  if (searchParams.get("download")) headers["Content-Disposition"] = `attachment; filename="nepcab-qr-${driverId}.png"`;

  return qrImage(driverId, `${await siteUrl()}${driver ? referralLink(driver) : `/r/${path}`}`, variant, headers);
}
