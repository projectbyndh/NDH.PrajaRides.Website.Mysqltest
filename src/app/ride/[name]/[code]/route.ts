import type { NextRequest } from "next/server";
import { handleReferral } from "@/lib/referral";

// /ride/ram/K7QM2XPA: a driver's referral link with their first name in it, for people to read.
// Only the code credits the driver, so a misspelt or changed name still works.
export async function GET(request: NextRequest, { params }: RouteContext<"/ride/[name]/[code]">) {
  const { code } = await params;
  return handleReferral(request, decodeURIComponent(code));
}
