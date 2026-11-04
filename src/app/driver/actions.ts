"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createDriverToken, DRIVER_COOKIE, DRIVER_SESSION_DAYS } from "@/lib/auth";
import { attemptLogin, completeDriverProfile, normalizePhone, registerDriverDevice } from "@/lib/drivers";
import { requireDriver } from "@/lib/session";
import { DEVICE_COOKIE, DEVICE_COOKIE_OPTIONS, isUuid } from "@/lib/tracking";
import { validateProfile, type FieldErrors } from "@/lib/validation";

export type DriverLoginState = { error?: string; phone?: string };

export async function driverLoginAction(_prev: DriverLoginState, formData: FormData): Promise<DriverLoginState> {
  const rawPhone = String(formData.get("phone") ?? "");
  const phone = normalizePhone(rawPhone);
  const pin = String(formData.get("pin") ?? "").trim();
  if (!phone || !/^\d{4,6}$/.test(pin)) return { error: "Enter your 10-digit mobile number and PIN.", phone: rawPhone };

  const result = await attemptLogin(phone, pin);
  if (!result.ok) return { error: result.error, phone: rawPhone };

  const jar = await cookies();
  jar.set(DRIVER_COOKIE, await createDriverToken(result.driverId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DRIVER_SESSION_DAYS * 86400,
  });

  // Tag this browser as the driver's own, so scanning their own QR from it never counts.
  let deviceId = jar.get(DEVICE_COOKIE)?.value;
  if (!isUuid(deviceId)) {
    deviceId = crypto.randomUUID();
    jar.set(DEVICE_COOKIE, deviceId, DEVICE_COOKIE_OPTIONS);
  }
  await registerDriverDevice(deviceId, result.driverId);

  redirect("/driver");
}

export async function driverLogoutAction() {
  (await cookies()).delete(DRIVER_COOKIE);
  redirect("/driver/login");
}

export type ProfileState = { error?: string; fieldErrors?: FieldErrors; values?: Record<string, string> };

/** Step 2 of signing up: an approved driver adds their documents, vehicle and payout details. */
export async function completeProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const driver = await requireDriver();
  const result = validateProfile(formData, driver);
  if (!result.ok) {
    const values: Record<string, string> = {};
    for (const [k, v] of formData) if (typeof v === "string" && !k.startsWith("$")) values[k] = v;
    return { error: "Please check the highlighted fields.", fieldErrors: result.errors, values };
  }
  await completeDriverProfile(driver.id, result.data);
  redirect("/driver");
}
