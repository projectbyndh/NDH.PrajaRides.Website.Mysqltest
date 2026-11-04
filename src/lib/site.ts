import "server-only";
import { headers } from "next/headers";

/** Domain encoded into QR codes and shared links. */
export async function siteUrl(): Promise<string> {
  // Always encode the production domain, even when the page is opened on another address.
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}
