"use server";

import { lookupApplicationStatus, type StatusLookup } from "@/lib/applications";
import { normalizePhone, type FieldErrors } from "@/lib/validation";

export type StatusState = { result?: StatusLookup; fieldErrors?: FieldErrors; values?: Record<string, string> };

export async function statusAction(_prev: StatusState, fd: FormData): Promise<StatusState> {
  const phoneRaw = String(fd.get("phone") ?? "").trim();
  const name = String(fd.get("name") ?? "").trim();
  const values = { phone: phoneRaw, name };
  const fieldErrors: FieldErrors = {};
  const phone = normalizePhone(phoneRaw);
  if (!phone) fieldErrors.phone = "Enter the 10-digit mobile number you applied with.";
  if (!name) fieldErrors.name = "Enter your name.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };
  // Small fixed delay makes guessing name combinations slow.
  await new Promise((r) => setTimeout(r, 600));
  return { result: await lookupApplicationStatus(phone!, name), values };
}
