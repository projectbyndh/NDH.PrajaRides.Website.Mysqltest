// WhatsApp messages sent to drivers from the admin panel (client-safe).

import { referralLink } from "./refcode";

/** Who is sending: company, city, service area and office phone (admin → Website). */
export type Identity = { company: string; city: string; area: string; phone: string };

type DriverMessage = {
  baseUrl: string;
  driverId: string;
  name?: string | null;
  phone?: string | null;
  /** Only known right after the driver is created or the PIN is reset. */
  pin?: string | null;
  /** Referral code used in links; falls back to the driver ID for old drivers. */
  code?: string | null;
  /** Just approved: the driver still has to complete their profile, so no QR or link yet. */
  needsProfile?: boolean;
};

export function driverWelcomeMessage({ baseUrl, driverId, name, phone, pin, code, needsProfile }: DriverMessage, who: Identity): string {
  const first = name?.trim().split(/\s+/)[0];
  if (needsProfile) {
    return [
      `Namaste${first ? ` ${first}` : ""}! 🙏`,
      `Your application to drive with ${who.company} is approved.`,
      "",
      "🔐 *Your driver portal login*",
      `Website: ${baseUrl}/driver`,
      `Mobile number: ${phone ?? "your registered mobile number"}`,
      pin ? `PIN: ${pin}` : "PIN: the PIN given to you by the NepCab office",
      "",
      "📝 Log in and complete your profile (license, vehicle and payout details). Once our office checks it, you get your QR code and referral link.",
      pin ? "Please keep your PIN private." : `Questions? Call the NepCab office: ${who.phone}`,
    ].join("\n");
  }
  const id = encodeURIComponent(code ?? driverId);
  return [
    `Namaste${first ? ` ${first}` : ""}! 🙏`,
    `Welcome to the NepCab driver referral program by ${who.company}`,
    "",
    "🔐 *Your driver portal login*",
    `Website: ${baseUrl}/driver`,
    phone ? `Mobile number: ${phone}` : "Mobile number: your registered mobile number",
    pin ? `PIN: ${pin}` : "PIN: the PIN given to you by the NepCab office",
    `Driver ID: ${driverId}`,
    "",
    "📲 *Your QR code* (print it or show it to riders):",
    `${baseUrl}/qr/${id}`,
    "",
    "🔗 *Your referral link* (share it with riders):",
    `${baseUrl}${referralLink({ id: driverId, refCode: code, name })}`,
    "",
    "In the portal you can see your referrals and rewards, and download your QR sticker.",
    pin ? "Please keep your PIN private." : `Forgot your PIN? Call the NepCab office: ${who.phone}`,
  ].join("\n");
}

/** Message for the general NepCab QR (no driver): for customers, groups, social posts. */
export function generalShareMessage(baseUrl: string, who: Identity): string {
  return [
    "Namaste! 🙏",
    `Ride with *NepCab* — safe, affordable rides around ${who.city}.`,
    "",
    "📲 Scan our QR code:",
    `${baseUrl}/qr/general`,
    "",
    "🔗 Or download the app here (Android & iPhone):",
    `${baseUrl}/r`,
    "",
    `NepCab ${who.city} · By ${who.company}`,
    `Call / WhatsApp: ${who.phone}`,
  ].join("\n");
}
