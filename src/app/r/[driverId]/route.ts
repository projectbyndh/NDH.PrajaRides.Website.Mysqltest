import type { NextRequest } from "next/server";
import { handleReferral } from "@/lib/referral";

// /r/DRV101
export async function GET(request: NextRequest, { params }: RouteContext<"/r/[driverId]">) {
  const { driverId } = await params;
  return handleReferral(request, decodeURIComponent(driverId));
}
