import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { normalizeDriverId, DIRECT_DRIVER_ID } from "./config";
import { sql } from "./db";
import { generateRefCode, isRefCode } from "./refcode";
import { isProfileComplete, type DriverData, type LicenseCategory, type PayoutMethod, type ProfileData, type VehicleType } from "./validation";

export { isValidPin, normalizePhone } from "./validation";
export type { VehicleType } from "./validation";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export type Driver = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  age: number | null;
  /** Dates are plain 'YYYY-MM-DD' strings (no timezone shifting). */
  dateOfBirth: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  municipality: string | null;
  ward: number | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  citizenshipNo: string | null;
  licenseNo: string | null;
  licenseCategory: LicenseCategory | null;
  licenseExpiry: string | null;
  vehicleNo: string | null;
  vehicleType: VehicleType;
  vehicleBrand: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehicleYear: number | null;
  bluebookNo: string | null;
  bluebookExpiry: string | null;
  insuranceExpiry: string | null;
  payoutMethod: PayoutMethod | null;
  payoutAccount: string | null;
  payoutBank: string | null;
  stickerGivenOn: string | null;
  trainingDone: boolean;
  notes: string | null;
  active: boolean;
  /** Random code used in links and QR codes, e.g. K7QM2XPA. */
  refCode: string | null;
  /** False for drivers approved from the short website form until they fill in the rest. */
  profileComplete: boolean;
  /** False until the office has checked the details the driver filled in. */
  verified: boolean;
  createdAt: Date;
};

const date = (col: string, as: string) => `to_char(${col}, 'YYYY-MM-DD') AS "${as}"`;
const COLUMNS = [
  "id", "name", "phone", "email", "age", date("date_of_birth", "dateOfBirth"), "address", "province", "district",
  "municipality", "ward", `emergency_name AS "emergencyName"`, `emergency_phone AS "emergencyPhone"`,
  `citizenship_no AS "citizenshipNo"`, `license_no AS "licenseNo"`, `license_category AS "licenseCategory"`,
  date("license_expiry", "licenseExpiry"), `vehicle_no AS "vehicleNo"`, `vehicle_type AS "vehicleType"`,
  `vehicle_brand AS "vehicleBrand"`, `vehicle_model AS "vehicleModel"`, `vehicle_color AS "vehicleColor"`,
  `vehicle_year AS "vehicleYear"`, `bluebook_no AS "bluebookNo"`, date("bluebook_expiry", "bluebookExpiry"),
  date("insurance_expiry", "insuranceExpiry"), `payout_method AS "payoutMethod"`, `payout_account AS "payoutAccount"`,
  `payout_bank AS "payoutBank"`, date("sticker_given_on", "stickerGivenOn"), `training_done AS "trainingDone"`,
  "notes", "active", `ref_code AS "refCode"`, `profile_complete AS "profileComplete"`, "verified", `created_at AS "createdAt"`,
].join(", ");

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(pin, salt, 32);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [, saltHex, hashHex] = stored.split(":");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(pin, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

export async function listDrivers(): Promise<Driver[]> {
  const q = await sql();
  return (await q.unsafe(`SELECT ${COLUMNS} FROM drivers ORDER BY created_at DESC`)) as unknown as Driver[];
}

export async function getDriver(id: string): Promise<Driver | null> {
  const q = await sql();
  const [row] = await q.unsafe(`SELECT ${COLUMNS} FROM drivers WHERE id = $1`, [id]);
  return (row as unknown as Driver) ?? null;
}

/** Next free DRVnnn, counting IDs already printed on stickers even if not registered. */
export async function nextDriverId(): Promise<string> {
  const q = await sql();
  const [row] = await q`
    SELECT GREATEST(100, COALESCE(max(substring(id FROM '^DRV(\\d+)$')::int), 100)) + 1 AS n
    FROM (SELECT id FROM drivers UNION SELECT DISTINCT driver_id FROM referral_clicks) ids`;
  return `DRV${row.n}`;
}

export type DriverInput = DriverData;

const isUniqueViolation = (err: unknown, constraint: string) =>
  (err as { code?: string; constraint_name?: string }).code === "23505" && !!(err as { constraint_name?: string }).constraint_name?.includes(constraint);

/** Column → value pairs for the editable profile fields. */
function profileColumns(d: DriverInput) {
  return {
    name: d.name, phone: d.phone, email: d.email, age: d.age, date_of_birth: d.dateOfBirth, address: d.address,
    province: d.province, district: d.district, municipality: d.municipality, ward: d.ward,
    emergency_name: d.emergencyName, emergency_phone: d.emergencyPhone, citizenship_no: d.citizenshipNo,
    license_no: d.licenseNo, license_category: d.licenseCategory, license_expiry: d.licenseExpiry,
    vehicle_type: d.vehicleType, vehicle_no: d.vehicleNo, vehicle_brand: d.vehicleBrand, vehicle_model: d.vehicleModel,
    vehicle_color: d.vehicleColor, vehicle_year: d.vehicleYear, bluebook_no: d.bluebookNo, bluebook_expiry: d.bluebookExpiry,
    insurance_expiry: d.insuranceExpiry, payout_method: d.payoutMethod, payout_account: d.payoutAccount,
    payout_bank: d.payoutBank, sticker_given_on: d.stickerGivenOn, training_done: d.trainingDone, notes: d.notes,
  };
}

/**
 * Creates the driver and returns their new referral code. `profileComplete: false` makes the
 * driver fill in the rest of their details on first login; `verified: false` keeps their QR
 * code and referral link locked until the office checks them.
 */
export async function createDriver(id: string, input: DriverInput, pin: string, { profileComplete = true, verified = true } = {}): Promise<string> {
  const q = await sql();
  const pinHash = await hashPin(pin);
  for (;;) {
    const code = generateRefCode();
    try {
      await q`INSERT INTO drivers ${q({ id, ...profileColumns(input), pin_hash: pinHash, ref_code: code, profile_complete: profileComplete, verified })}`;
      return code;
    } catch (err) {
      if (!isUniqueViolation(err, "ref_code")) throw err; // other clashes (phone, ID) go to the caller
    }
  }
}

/** Issues a new referral code; the old link and QR stop crediting this driver. */
export async function regenerateRefCode(id: string): Promise<string> {
  const q = await sql();
  for (;;) {
    const code = generateRefCode();
    try {
      await q`UPDATE drivers SET ref_code = ${code} WHERE id = ${id}`;
      return code;
    } catch (err) {
      if (!isUniqueViolation(err, "ref_code")) throw err;
    }
  }
}

export async function getDriverByRefCode(code: string): Promise<Driver | null> {
  const q = await sql();
  const [row] = await q.unsafe(`SELECT ${COLUMNS} FROM drivers WHERE ref_code = $1`, [code]);
  return (row as unknown as Driver) ?? null;
}

/**
 * Old-style links (/r/DRV101) keep working so printed stickers don't break. Set
 * LEGACY_DRIVER_LINKS=false once every sticker uses a referral code, so IDs can't be guessed.
 */
export const legacyLinksEnabled = () => process.env.LEGACY_DRIVER_LINKS !== "false";

export type Referral = { driverId: string; driver: Driver | null };

/** Turns whatever is in a referral link (code or legacy driver ID) into the driver it credits. */
export async function resolveReferral(raw: string | null | undefined): Promise<Referral> {
  const value = (raw ?? "").trim().toUpperCase();
  if (!value) return { driverId: DIRECT_DRIVER_ID, driver: null };
  if (isRefCode(value)) {
    const driver = await getDriverByRefCode(value);
    if (driver) return { driverId: driver.id, driver };
  }
  if (!legacyLinksEnabled()) return { driverId: DIRECT_DRIVER_ID, driver: null };
  const id = normalizeDriverId(value);
  const driver = id === DIRECT_DRIVER_ID ? null : await getDriver(id);
  // An unknown code (e.g. replaced with "Generate new link") credits nobody, rather than
  // showing up as a fake unregistered driver.
  if (!driver && isRefCode(value)) return { driverId: DIRECT_DRIVER_ID, driver: null };
  return { driverId: id, driver };
}

export async function updateDriver(id: string, input: DriverInput & { active: boolean }): Promise<void> {
  const q = await sql();
  // The office filling in the missing details also lets the driver skip the profile step.
  const done = isProfileComplete(input) ? { profile_complete: true } : {};
  await q`UPDATE drivers SET ${q({ ...profileColumns(input), active: input.active, ...done })} WHERE id = ${id}`;
}

/** The office has checked the driver's details: unlocks their QR code and referral link. */
export async function verifyDriver(id: string): Promise<boolean> {
  const q = await sql();
  const res = await q`UPDATE drivers SET verified = true, profile_complete = true WHERE id = ${id}`;
  return res.count > 0;
}

/** Saves the details a driver fills in themselves in the portal, and marks the profile complete. */
export async function completeDriverProfile(id: string, p: ProfileData): Promise<void> {
  const q = await sql();
  const cols = {
    email: p.email, age: p.age, date_of_birth: p.dateOfBirth, citizenship_no: p.citizenshipNo, address: p.address,
    district: p.district, municipality: p.municipality, ward: p.ward, emergency_name: p.emergencyName,
    emergency_phone: p.emergencyPhone, license_no: p.licenseNo, license_category: p.licenseCategory,
    license_expiry: p.licenseExpiry, vehicle_type: p.vehicleType, vehicle_no: p.vehicleNo, vehicle_brand: p.vehicleBrand,
    vehicle_model: p.vehicleModel, vehicle_color: p.vehicleColor, vehicle_year: p.vehicleYear, bluebook_no: p.bluebookNo,
    bluebook_expiry: p.bluebookExpiry, insurance_expiry: p.insuranceExpiry, payout_method: p.payoutMethod,
    payout_account: p.payoutAccount, payout_bank: p.payoutBank,
  };
  await q`UPDATE drivers SET ${q({ ...cols, profile_complete: true })} WHERE id = ${id}`;
}

export async function setPin(id: string, pin: string): Promise<void> {
  const q = await sql();
  await q`UPDATE drivers SET pin_hash = ${await hashPin(pin)}, failed_logins = 0, locked_until = NULL WHERE id = ${id}`;
}

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export type LoginResult = { ok: true; driverId: string } | { ok: false; error: string };

/** Phone + PIN check with lockout after repeated wrong PINs (4-digit PINs are guessable). */
export async function attemptLogin(phone: string, pin: string): Promise<LoginResult> {
  const generic = { ok: false as const, error: "Wrong phone number or PIN." };
  const q = await sql();
  const [d] = await q`
    SELECT id, pin_hash, active, failed_logins, locked_until > now() AS locked,
           ceil(extract(epoch FROM locked_until - now()) / 60)::int AS "minutesLeft"
    FROM drivers WHERE phone = ${phone}`;
  if (!d) {
    await verifyPin(pin, "scrypt:00:00").catch(() => {}); // similar timing for unknown phones
    return generic;
  }
  if (d.locked) {
    return { ok: false, error: `Too many wrong PINs. Try again in ${d.minutesLeft} min or ask the office to reset it.` };
  }
  if (!(await verifyPin(pin, d.pin_hash))) {
    const failed = d.failed_logins + 1;
    await q`
      UPDATE drivers
      SET failed_logins = ${failed >= MAX_FAILED ? 0 : failed},
          locked_until  = ${failed >= MAX_FAILED ? q`now() + ${`${LOCK_MINUTES} minutes`}::interval` : null}
      WHERE id = ${d.id}`;
    return generic;
  }
  if (!d.active) return { ok: false, error: "This account is inactive. Please contact the NepCab office." };
  await q`UPDATE drivers SET failed_logins = 0, locked_until = NULL WHERE id = ${d.id}`;
  return { ok: true, driverId: d.id };
}

/** Marks a browser as belonging to a driver so its store taps never count as referrals. */
export async function registerDriverDevice(deviceId: string, driverId: string): Promise<void> {
  const q = await sql();
  await q`INSERT INTO driver_devices (device_id, driver_id) VALUES (${deviceId}, ${driverId}) ON CONFLICT (device_id) DO NOTHING`;
}

/**
 * Removes the driver's profile and login. Scan history and earned rewards are kept, so totals
 * don't change; the ID shows as "not registered" and can be registered again later.
 */
export async function deleteDriver(id: string): Promise<boolean> {
  const q = await sql();
  return q.begin(async (tx) => {
    await tx`DELETE FROM driver_devices WHERE driver_id = ${id}`;
    // Nothing is owed to a removed driver: drop unpaid rewards (paid/cancelled stay as payment
    // history). Link visits stay too, so the ID is never handed to a new driver (nextDriverId).
    await tx`DELETE FROM driver_rewards WHERE driver_id = ${id} AND status = 'pending'`;
    await tx`UPDATE driver_applications SET driver_id = NULL WHERE driver_id = ${id}`;
    const res = await tx`DELETE FROM drivers WHERE id = ${id}`;
    return res.count > 0;
  });
}

export type ExpiringDocument = { driverId: string; name: string; document: "License" | "Insurance" | "Bluebook"; date: string; daysLeft: number };

/** Active drivers' documents that expired or expire within `days` days, soonest first. */
export async function listExpiringDocuments(days = 30): Promise<ExpiringDocument[]> {
  const q = await sql();
  const rows = await q`
    SELECT id AS "driverId", name, doc AS document, to_char(d, 'YYYY-MM-DD') AS date,
           (d - (now() AT TIME ZONE 'Asia/Kathmandu')::date)::int AS "daysLeft"
    FROM drivers,
         LATERAL (VALUES ('License', license_expiry), ('Insurance', insurance_expiry), ('Bluebook', bluebook_expiry)) v(doc, d)
    WHERE active AND d IS NOT NULL AND d <= (now() AT TIME ZONE 'Asia/Kathmandu')::date + ${days}::int
    ORDER BY d`;
  return rows as unknown as ExpiringDocument[];
}
