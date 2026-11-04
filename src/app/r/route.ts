import type { NextRequest } from "next/server";
import { handleReferral } from "@/lib/referral";

// /r?driver=DRV101
export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return handleReferral(request, searchParams.get("driver") ?? searchParams.get("d"));
}
