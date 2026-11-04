import { after, NextResponse, type NextRequest } from "next/server";
import { appStoreLink, DIRECT_DRIVER_ID, normalizeDriverId, playStoreLink } from "./config";
import { logClick } from "./db";
import { legacyLinksEnabled, resolveReferral, type Referral } from "./drivers";
import { referralPath } from "./refcode";
import { DEVICE_COOKIE, DEVICE_COOKIE_OPTIONS, deviceIdFrom, isBot, requestMeta } from "./tracking";

/**
 * Shared handler for /r/K7QM2XPA (referral code), /r/DRV101 and /r?driver=DRV101 (legacy IDs).
 * Logs the scan after the response is sent (so the rider never waits on the DB),
 * then sends them to the landing page — or straight to the store when AUTO_REDIRECT=true.
 */
export async function handleReferral(request: NextRequest, raw: string | null): Promise<NextResponse> {
  let ref: Referral;
  try {
    ref = await resolveReferral(raw);
  } catch (err) {
    // Never block a rider on a database hiccup: fall back to the raw ID.
    console.error("[referral] lookup failed", err);
    ref = { driverId: legacyLinksEnabled() ? normalizeDriverId(raw) : DIRECT_DRIVER_ID, driver: null };
  }
  const { driverId } = ref;
  const meta = requestMeta(request);
  const visitId = crypto.randomUUID();
  const existingDevice = deviceIdFrom(request);
  const deviceId = existingDevice ?? crypto.randomUUID();

  if (!isBot(request)) {
    after(async () => {
      try {
        await logClick({ id: visitId, driverId, eventType: "scan", deviceId, ...meta });
      } catch (err) {
        console.error("[referral] failed to log scan", err);
      }
    });
  }

  let target: URL;
  if (process.env.AUTO_REDIRECT === "true" && meta.platform === "android") {
    target = new URL(playStoreLink(driverId));
  } else if (process.env.AUTO_REDIRECT === "true" && meta.platform === "ios") {
    target = new URL(appStoreLink(driverId));
  } else {
    target = new URL("/download", request.url);
    // Pass the code (not the readable ID) along, so links shared from the landing page stay unguessable.
    if (driverId !== DIRECT_DRIVER_ID) target.searchParams.set("ref", ref.driver ? referralPath(ref.driver) : driverId);
    target.searchParams.set("p", meta.platform);
    target.searchParams.set("v", visitId);
  }

  const res = NextResponse.redirect(target, 302);
  res.headers.set("Cache-Control", "no-store");
  if (!existingDevice) res.cookies.set(DEVICE_COOKIE, deviceId, DEVICE_COOKIE_OPTIONS);
  return res;
}
