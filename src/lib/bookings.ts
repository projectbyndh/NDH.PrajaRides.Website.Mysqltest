import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "./db";
import type { BookingData, BookingVehicle } from "./validation";

// Ride requests from the website. NepCab's dispatch is run by head office, so the Butwal booking
// desk calls the customer back and books the ride; these rows track that work.

export type BookingStatus = "new" | "confirmed" | "completed" | "cancelled";

export type Booking = {
  id: string;
  name: string;
  phone: string;
  pickup: string;
  dropoff: string;
  vehicleType: BookingVehicle;
  rideAt: Date | null;
  note: string | null;
  sharePref: string | null;
  availability: string | null;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date | null;
};

const COLUMNS = `id, name, phone, pickup, dropoff, vehicle_type AS vehicleType, ride_at AS rideAt, note,
  share_pref AS sharePref, availability, status,
  created_at AS createdAt, updated_at AS updatedAt`;

export async function createBooking(b: BookingData, ipAddress: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const q = await sql();
  // Light abuse guard: a handful of requests per network per hour.
  if (ipAddress) {
    const [{ n }] = await q`SELECT count(*) AS n FROM ride_bookings WHERE ip_address = ${ipAddress} AND created_at > UTC_TIMESTAMP() - INTERVAL 1 HOUR`;
    if (Number(n) >= 6) return { ok: false, error: "Too many bookings from this network. Please call us instead." };
  }
  // A double tap or resend: the same number already has an open request for the same trip.
  const [open] = await q`
    SELECT 1 FROM ride_bookings
    WHERE phone = ${b.phone} AND status = 'new' AND lower(pickup) = lower(${b.pickup}) AND lower(dropoff) = lower(${b.dropoff})
      AND created_at > UTC_TIMESTAMP() - INTERVAL 30 MINUTE`;
  if (open) return { ok: true };
  // The id has no default in the MySQL schema (Postgres used gen_random_uuid()), so it is set here.
  await q`
    INSERT INTO ride_bookings ${q({
      id: randomUUID(),
      name: b.name, phone: b.phone, pickup: b.pickup, dropoff: b.dropoff, vehicle_type: b.vehicleType,
      ride_at: b.rideAt, note: b.note, share_pref: b.sharePref, availability: b.availability, ip_address: ipAddress,
    })}`;
  return { ok: true };
}

export async function listBookings(): Promise<Booking[]> {
  const q = await sql();
  const rows = await q.unsafe(`SELECT ${COLUMNS} FROM ride_bookings ORDER BY created_at DESC LIMIT 500`);
  return rows as unknown as Booking[];
}

export async function countNewBookings(): Promise<number> {
  const q = await sql();
  const [{ n }] = await q`SELECT count(*) AS n FROM ride_bookings WHERE status = 'new'`;
  return Number(n);
}

export async function setBookingStatus(id: string, status: BookingStatus): Promise<boolean> {
  const q = await sql();
  const res = await q`UPDATE ride_bookings SET status = ${status}, updated_at = UTC_TIMESTAMP() WHERE id = ${id}`;
  return res.count > 0;
}
