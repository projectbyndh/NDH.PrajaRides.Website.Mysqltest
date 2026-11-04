"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeDriverId } from "@/lib/config";
import { markApplication } from "@/lib/applications";
import { createDriver, deleteDriver, getDriver, nextDriverId, regenerateRefCode, setPin, updateDriver, verifyDriver } from "@/lib/drivers";
import { requireAdmin } from "@/lib/session";
import { driverFieldError, isProfileComplete, pinError, validateDriver, type FieldErrors } from "@/lib/validation";

export type FormState = {
  /** Problem not tied to one field. */
  error?: string;
  fieldErrors?: FieldErrors;
  /** Shown once after creating a driver / resetting a PIN, to hand over to the driver. */
  credentials?: { id: string; name: string; phone: string; pin: string; code: string | null; needsProfile?: boolean };
  saved?: boolean;
  /** Echoed back on error, because React resets the form after every submit. */
  values?: Record<string, string>;
};

function fail(formData: FormData, fieldErrors: FieldErrors, error?: string): FormState {
  const values: Record<string, string> = {};
  for (const [k, v] of formData) if (k !== "pin" && k !== "applicationId" && typeof v === "string" && !k.startsWith("$")) values[k] = v;
  return { error: error ?? "Please fix the highlighted fields.", fieldErrors, values };
}

/** Maps a Postgres unique violation to the field it belongs to. */
function uniqueViolation(err: unknown): FieldErrors | null {
  const e = err as { code?: string; constraint_name?: string };
  if (e?.code !== "23505") return null;
  return e.constraint_name?.includes("phone")
    ? { phone: "Another driver already uses this mobile number." }
    : { id: "This driver ID is already registered." };
}

export async function createDriverAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const result = validateDriver(formData);
  const pin = String(formData.get("pin") ?? "").trim();
  const rawId = String(formData.get("id") ?? "").trim();
  const extra: FieldErrors = {};
  const pinMsg = pinError(pin);
  if (pinMsg) extra.pin = pinMsg;
  const idMsg = driverFieldError("id", rawId);
  if (idMsg) extra.id = idMsg;
  if (!result.ok || Object.keys(extra).length) return fail(formData, { ...(result.ok ? {} : result.errors), ...extra });

  const id = rawId ? normalizeDriverId(rawId) : await nextDriverId();
  const applicationId = String(formData.get("applicationId") ?? "");
  const fromApplication = /^[0-9a-f-]{36}$/i.test(applicationId);
  const complete = !fromApplication || isProfileComplete(result.data);
  let code: string;
  try {
    // Approved from the short website form: unless the office filled everything in, the driver
    // completes their profile on first login and the office verifies it before the QR unlocks.
    code = await createDriver(id, result.data, pin, { profileComplete: complete, verified: complete });
  } catch (err) {
    const fieldErrors = uniqueViolation(err);
    if (fieldErrors) return fail(formData, fieldErrors);
    throw err;
  }
  // Approving a website application: link it to the new driver. Don't refresh here: the
  // application card (and the one-time PIN shown in it) would disappear; the panel refreshes on "Done".
  if (fromApplication) await markApplication(applicationId, "approved", null, id);
  else refresh();
  return { credentials: { id, name: result.data.name, phone: result.data.phone, pin, code, needsProfile: !complete } };
}

export async function updateDriverAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const result = validateDriver(formData);
  if (!result.ok) return fail(formData, result.errors);
  try {
    await updateDriver(id, { ...result.data, active: formData.get("active") === "on" });
  } catch (err) {
    const fieldErrors = uniqueViolation(err);
    if (fieldErrors) return fail(formData, fieldErrors);
    throw err;
  }
  refresh();
  return { saved: true };
}

export async function resetPinAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const pin = String(formData.get("pin") ?? "").trim();
  const msg = pinError(pin);
  if (msg) return { fieldErrors: { pin: msg } };
  const driver = await getDriver(id);
  if (!driver) return { error: "Driver not found." };
  await setPin(id, pin);
  return { credentials: { id, name: driver.name, phone: driver.phone, pin, code: driver.refCode } };
}

export async function deleteDriverAction(id: string, confirmation: string, backToList = false): Promise<{ error?: string }> {
  await requireAdmin();
  if (confirmation.trim().toUpperCase() !== id) return { error: `Type ${id} to confirm.` };
  if (!(await deleteDriver(id))) return { error: "Driver not found — it may already be deleted." };
  if (backToList) redirect("/admin/drivers");
  refresh();
  return {};
}

export async function regenerateCodeAction(id: string): Promise<{ code?: string; error?: string }> {
  await requireAdmin();
  if (!(await getDriver(id))) return { error: "Driver not found." };
  const code = await regenerateRefCode(id);
  refresh();
  return { code };
}

export async function verifyDriverAction(id: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!(await verifyDriver(id))) return { error: "Driver not found." };
  refresh();
  return {};
}
