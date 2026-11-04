import { userAgent, type NextRequest } from "next/server";

export type Platform = "android" | "ios" | "desktop";

export function detectPlatform(ua: string): Platform {
  if (/android/i.test(ua)) return "android";
  // iPadOS 13+ reports as "Macintosh" but still includes "Mobile/" in Safari's UA.
  if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && /mobile\//i.test(ua))) return "ios";
  return "desktop";
}

// Link-preview fetchers (WhatsApp, Messenger, Viber…) open the URL when a link is pasted
// in a chat. Counting them would inflate every driver's numbers.
const PREVIEW_BOTS =
  /whatsapp|facebookexternalhit|facebot|meta-externalagent|viber|telegrambot|twitterbot|slackbot|discordbot|linkedinbot|skypeuripreview|googlebot|bingbot|bot\b|crawler|spider|preview/i;

export function isBot(request: Request): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  return !ua || userAgent(request).isBot || PREVIEW_BOTS.test(ua);
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 64);
  return request.headers.get("x-real-ip")?.slice(0, 64) ?? null;
}

export function requestMeta(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  return {
    platform: detectPlatform(ua),
    ipAddress: clientIp(request),
    userAgent: ua.slice(0, 512) || null,
    referrer: request.headers.get("referer")?.slice(0, 512) ?? null,
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** First-party cookie that identifies a rider's browser, so one phone counts once. */
export const DEVICE_COOKIE = "nc_dev";
export const DEVICE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 400,
};

export function deviceIdFrom(request: NextRequest): string | null {
  const v = request.cookies.get(DEVICE_COOKIE)?.value;
  return isUuid(v) ? v : null;
}
