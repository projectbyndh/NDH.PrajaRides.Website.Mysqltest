"use server";

import { refresh } from "next/cache";
import { setBookingStatus, type BookingStatus } from "@/lib/bookings";
import { requireAdmin } from "@/lib/session";

const STATUSES: BookingStatus[] = ["new", "confirmed", "completed", "cancelled"];

export async function setBookingStatusAction(id: string, status: BookingStatus): Promise<{ error?: string }> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !STATUSES.includes(status)) return { error: "Booking not found." };
  if (!(await setBookingStatus(id, status))) return { error: "Booking not found." };
  refresh();
  return {};
}
