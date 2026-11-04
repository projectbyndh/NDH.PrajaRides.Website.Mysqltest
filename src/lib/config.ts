export const BRAND = {
  name: "NepCab",
  tagline: "यात्राको साथी",
  city: "Butwal",
  /** Service area from the official NepCab "Book Your Ride" banner. */
  serviceArea: "Butwal – Bhairahawa",
  /** Office address and email from the same banner. */
  office: "Tilottama-5, Coffeecompany, Butwal, Nepal",
  email: "prajaride@gmail.com",
  company: "Praja Ride Pvt. Ltd.",
  whatsapp: "9743435043",
  tollFree: "18105000366",
  social: "@nepcabbutwal",
  tiktokUrl: "https://www.tiktok.com/@nepcabbutwal",
  facebookUrl: "https://www.facebook.com/share/p/1BdmDScLY3/",
};

// Override per environment without a code change (environment variables on the server).
export const PLAY_STORE_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ??
  "https://play.google.com/store/apps/details?id=com.nepcab.user";
export const APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL ??
  "https://apps.apple.com/np/app/nepcab/id6746757374";

/** Driver IDs are normalized to uppercase A–Z, 0–9, '-' and '_' (max 32 chars). */
export const DIRECT_DRIVER_ID = "DIRECT";
/** Path segment for the general (no-driver) NepCab QR: /qr/general. */
export const GENERAL_QR = "general";

export function normalizeDriverId(raw: string | null | undefined): string {
  const id = (raw ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 32);
  return id || DIRECT_DRIVER_ID;
}

/**
 * Campaign tags the stores record with each install. The app is shared with other NepCab
 * cities (e.g. Nepalgunj), so every tag names this franchise: head office can filter their
 * reports to Butwal / Praja Ride only. Override per deployment with env vars.
 */
export const CAMPAIGN = {
  /** Google Play: UTM source that marks this franchise's links. */
  source: process.env.NEXT_PUBLIC_CAMPAIGN_SOURCE ?? "prajaride_butwal",
  /** App Store: prefix for campaign tokens (ct), e.g. BWL-DRV101. ct allows 40 characters. */
  prefix: process.env.NEXT_PUBLIC_CAMPAIGN_PREFIX ?? "BWL",
};

/** Campaign name per driver; the general QR / main page is "GENERAL". */
const campaignName = (driverId: string) => (driverId === DIRECT_DRIVER_ID ? "GENERAL" : driverId);

/** Play Store link. The install referrer is kept by Google and shows in Play Console reports. */
export function playStoreLink(driverId: string): string {
  const referrer = new URLSearchParams({
    utm_source: CAMPAIGN.source,
    utm_medium: driverId === DIRECT_DRIVER_ID ? "general" : "driver",
    utm_campaign: campaignName(driverId),
  }).toString();
  const url = new URL(PLAY_STORE_URL);
  url.searchParams.set("referrer", referrer);
  return url.toString();
}

/** App Store link. ct shows under App Analytics → Campaigns (needs the provider token, pt). */
export function appStoreLink(driverId: string): string {
  const url = new URL(APP_STORE_URL);
  url.searchParams.set("ct", `${CAMPAIGN.prefix}-${campaignName(driverId)}`.slice(0, 40));
  if (process.env.NEXT_PUBLIC_APP_STORE_PROVIDER_TOKEN) {
    url.searchParams.set("pt", process.env.NEXT_PUBLIC_APP_STORE_PROVIDER_TOKEN);
  }
  url.searchParams.set("mt", "8");
  return url.toString();
}
