import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "./db";
import { after } from "next/server";
import { deleteObjects, extFor, flushPending, getObject, queueObject, storageKey } from "./storage";
import type { ApplicationData, Availability, LicenseCategory, Ownership, VehicleType } from "./validation";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export type Application = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  dateOfBirth: string | null;
  district: string | null;
  municipality: string | null;
  ward: number | null;
  vehicleType: VehicleType;
  vehicleNo: string | null;
  vehicleBrand: string | null;
  licenseNo: string | null;
  licenseCategory: LicenseCategory | null;
  licenseExpiry: string | null;
  message: string | null;
  status: ApplicationStatus;
  reviewNote: string | null;
  driverId: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  citizenshipNo: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehicleYear: number | null;
  ownership: Ownership | null;
  bluebookNo: string | null;
  insuranceExpiry: string | null;
  availability: Availability | null;
};

/** New applications send vehicle and license photos; older ones may also have a bluebook photo. */
export type PhotoKind = "vehicle" | "license" | "bluebook";
/** A photo sent with an application, already resized in the browser and checked by the server. */
export type ApplicationPhotoInput = { kind: PhotoKind; mime: string; data: Buffer; thumb: Buffer; width: number; height: number };
export type ApplicationPhoto = { id: string; applicationId: string; kind: PhotoKind; width: number; height: number };

const COLUMNS = `id, name, phone, email, address, to_char(date_of_birth, 'YYYY-MM-DD') AS "dateOfBirth", district, municipality, ward,
  vehicle_type AS "vehicleType", vehicle_no AS "vehicleNo", vehicle_brand AS "vehicleBrand", license_no AS "licenseNo",
  license_category AS "licenseCategory", to_char(license_expiry, 'YYYY-MM-DD') AS "licenseExpiry", message, status,
  review_note AS "reviewNote", driver_id AS "driverId", created_at AS "createdAt", reviewed_at AS "reviewedAt",
  citizenship_no AS "citizenshipNo", emergency_name AS "emergencyName", emergency_phone AS "emergencyPhone",
  vehicle_model AS "vehicleModel", vehicle_color AS "vehicleColor", vehicle_year AS "vehicleYear", ownership,
  bluebook_no AS "bluebookNo", to_char(insurance_expiry, 'YYYY-MM-DD') AS "insuranceExpiry", availability`;

export type SubmitResult = { ok: true } | { ok: false; field?: string; error: string };

/** Saves a website application with its photos, refusing duplicates and existing drivers. */
export async function submitApplication(a: ApplicationData, ipAddress: string | null, photos: ApplicationPhotoInput[] = []): Promise<SubmitResult> {
  const q = await sql();
  const [driver] = await q`SELECT 1 FROM drivers WHERE phone = ${a.phone}`;
  if (driver) return { ok: false, field: "phone", error: "This number is already registered as a driver. Log in at /driver." };
  const [pending] = await q`SELECT 1 FROM driver_applications WHERE phone = ${a.phone} AND status = 'pending'`;
  if (pending) return { ok: false, field: "phone", error: "We already have your application. Our team will call you soon." };
  // Light abuse guard: at most 5 applications per network per day.
  if (ipAddress) {
    const [{ n }] = await q`SELECT count(*)::int AS n FROM driver_applications WHERE ip_address = ${ipAddress} AND created_at > now() - interval '1 day'`;
    if (n >= 5) return { ok: false, error: "Too many applications from this network today. Please call us instead." };
  }
  // Photos are saved on the server's disk first, then uploaded to object storage in the background
  // after the reply (see queueObject), so the applicant isn't kept waiting on slow uploads. If the
  // application can't be saved, the photos are removed again.
  const applicationId = randomUUID();
  const stored = photos.map((p) => {
    const id = randomUUID();
    const ext = extFor(p.mime);
    return { p, id, fullKey: storageKey(`applications/${applicationId}/${id}.${ext}`), thumbKey: storageKey(`applications/${applicationId}/${id}-thumb.${ext}`) };
  });
  const keys = stored.flatMap((s) => [s.fullKey, s.thumbKey]);
  const started = Date.now();
  try {
    await Promise.all(stored.flatMap(({ p, fullKey, thumbKey }) => [queueObject(fullKey, p.data, p.mime), queueObject(thumbKey, p.thumb, p.mime)]));
    const uploadedAt = Date.now();
    await q.begin(async (tx) => {
      await tx`
        INSERT INTO driver_applications ${tx({
          id: applicationId, name: a.name, phone: a.phone, address: a.address, message: a.message, ip_address: ipAddress,
        })}`;
      for (const { p, id, fullKey, thumbKey } of stored) {
        await tx`
          INSERT INTO application_photos ${tx({
            id, application_id: applicationId, kind: p.kind, mime: p.mime, storage_key: fullKey, thumb_key: thumbKey, width: p.width, height: p.height,
          })}`;
      }
    });
    console.log(`[applications] saved ${applicationId}: ${photos.length} photos stored in ${uploadedAt - started} ms, saved in ${Date.now() - uploadedAt} ms`);
    after(async () => {
      const t = Date.now();
      const { uploaded, failed } = await flushPending(keys);
      console.log(`[applications] ${applicationId}: ${uploaded} files uploaded in ${Date.now() - t} ms${failed ? `, ${failed} will be retried` : ""}`);
    });
  } catch (err) {
    // The application wasn't saved: remove any photos already uploaded for it
    await deleteObjects(keys);
    throw err;
  }
  return { ok: true };
}

export async function listApplications(status?: ApplicationStatus): Promise<Application[]> {
  const q = await sql();
  const rows = await q.unsafe(
    `SELECT ${COLUMNS} FROM driver_applications ${status ? "WHERE status = $1" : ""} ORDER BY status = 'pending' DESC, created_at DESC LIMIT 500`,
    status ? [status] : [],
  );
  return rows as unknown as Application[];
}

export async function getApplication(id: string): Promise<Application | null> {
  const q = await sql();
  const [row] = await q.unsafe(`SELECT ${COLUMNS} FROM driver_applications WHERE id = $1`, [id]);
  return (row as unknown as Application) ?? null;
}

/** Photo details (no bytes) for the given applications, vehicle photos first. */
export async function listApplicationPhotos(applicationIds: string[]): Promise<ApplicationPhoto[]> {
  if (!applicationIds.length) return [];
  const q = await sql();
  const rows = await q`
    SELECT id, application_id AS "applicationId", kind, width, height FROM application_photos
    WHERE application_id = ANY(${applicationIds}::uuid[])
    ORDER BY kind = 'vehicle' DESC, kind, created_at`;
  return rows as unknown as ApplicationPhoto[];
}

export async function readApplicationPhoto(id: string, size: "full" | "thumb"): Promise<{ mime: string; bytes: Buffer } | null> {
  const q = await sql();
  const [row] = await q`SELECT mime, storage_key, thumb_key FROM application_photos WHERE id = ${id}`;
  if (!row) return null;
  const key = size === "thumb" ? (row.thumb_key ?? row.storage_key) : row.storage_key;
  if (key) {
    const obj = await getObject(key);
    return obj ? { mime: row.mime as string, bytes: obj.bytes } : null;
  }
  const [legacy] = size === "thumb" ? await q`SELECT thumb AS bytes FROM application_photos WHERE id = ${id}` : await q`SELECT data AS bytes FROM application_photos WHERE id = ${id}`;
  return legacy?.bytes ? { mime: row.mime as string, bytes: legacy.bytes as Buffer } : null;
}

export async function countPendingApplications(): Promise<number> {
  const q = await sql();
  const [{ n }] = await q`SELECT count(*)::int AS n FROM driver_applications WHERE status = 'pending'`;
  return n;
}

export async function markApplication(id: string, status: ApplicationStatus, note: string | null, driverId: string | null = null): Promise<void> {
  const q = await sql();
  await q`
    UPDATE driver_applications
    SET status = ${status}, review_note = ${note}, driver_id = ${driverId},
        reviewed_at = ${status === "pending" ? null : q`now()`}
    WHERE id = ${id}`;
}

export type StatusLookup =
  | { found: false }
  | { found: true; status: ApplicationStatus | "driver"; name: string; appliedOn: Date | null; reviewedOn: Date | null };

/**
 * Public status check: needs the phone number AND the first name from the application, so a
 * phone number alone reveals nothing. Returns only the first name and the status.
 */
export async function lookupApplicationStatus(phone: string, name: string): Promise<StatusLookup> {
  const q = await sql();
  const firstName = (n: string) => n.trim().split(/\s+/)[0];
  const matches = (n: string | undefined) => !!n && firstName(n).toLowerCase() === firstName(name).toLowerCase();
  const [app] = await q`
    SELECT name, status, created_at, reviewed_at FROM driver_applications
    WHERE phone = ${phone} ORDER BY created_at DESC LIMIT 1`;
  const [driver] = await q`SELECT name FROM drivers WHERE phone = ${phone}`;
  if (driver && (matches(driver.name) || matches(app?.name))) {
    return { found: true, status: "driver", name: firstName(driver.name), appliedOn: app?.created_at ?? null, reviewedOn: app?.reviewed_at ?? null };
  }
  if (!app || !matches(app.name)) return { found: false };
  return { found: true, status: app.status, name: firstName(app.name), appliedOn: app.created_at, reviewedOn: app.reviewed_at };
}
