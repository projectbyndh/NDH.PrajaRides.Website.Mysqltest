"use server";

import { headers } from "next/headers";
import { createBooking } from "@/lib/bookings";
import { validateBooking, type BookingData, type FieldErrors } from "@/lib/validation";

export type BookState = { done?: BookingData; error?: string; fieldErrors?: FieldErrors; values?: Record<string, string> };

const ipOf = async () => (await headers()).get("x-forwarded-for")?.split(",")[0].trim().slice(0, 64) ?? null;

export async function bookRideAction(_prev: BookState, formData: FormData): Promise<BookState> {
  const values: Record<string, string> = {};
  for (const [k, v] of formData) if (typeof v === "string" && !k.startsWith("$")) values[k] = v;
  // Honeypot: real people never see or fill this field.
  if (values.website) return { error: "Please call us to book." };

  const result = validateBooking(formData);
  if (!result.ok) return { error: "Please check the highlighted fields.", fieldErrors: result.errors, values };
  const saved = await createBooking(result.data, await ipOf());
  if (!saved.ok) return { error: saved.error, values };
  return { done: result.data };
}
