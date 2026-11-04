import { after, NextResponse, type NextRequest } from "next/server";
import { normalizeDriverId } from "@/lib/config";
import { logClick } from "@/lib/db";
import { syncRewards } from "@/lib/rewards";
import { deviceIdFrom, isBot, isUuid, requestMeta } from "@/lib/tracking";

// Called with navigator.sendBeacon from the download buttons.
export async function POST(request: NextRequest) {
  if (isBot(request)) return new NextResponse(null, { status: 204 });

  let body: { driverId?: unknown; store?: unknown; visitId?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const store = body.store === "play" || body.store === "appstore" ? body.store : null;
  if (!store) return NextResponse.json({ error: "store must be 'play' or 'appstore'" }, { status: 400 });

  try {
    await logClick({
      driverId: normalizeDriverId(typeof body.driverId === "string" ? body.driverId : null),
      eventType: "store_click",
      store,
      visitId: isUuid(body.visitId) ? body.visitId : null,
      deviceId: deviceIdFrom(request),
      ...requestMeta(request),
    });
  } catch (err) {
    console.error("[track-click] failed to log", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // A store tap may push the driver over a reward target.
  after(() => syncRewards().catch((err) => console.error("[track-click] reward sync failed", err)));
  return new NextResponse(null, { status: 204 });
}
