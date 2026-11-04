// Form rules shared by the browser (instant feedback) and server actions (the real check).
// Keep this file free of server-only imports so client components can use it.

export type FieldErrors = Record<string, string>;
export type Result<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

const str = (v: FormDataEntryValue | string | null | undefined) => (typeof v === "string" ? v.trim() : "");

/** Accepts 98XXXXXXXX, +977 98XXXXXXXX, 977-98…; returns 10 digits or null. */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("977")) digits = digits.slice(3);
  // Nepali mobiles: 96x (Smart), 97x / 98x (NTC, Ncell).
  return /^9[678]\d{8}$/.test(digits) ? digits : null;
}

export const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin);

/** Rejects PINs anyone would try first: 1111, 1234, 4321… */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;
  const up = "0123456789", down = "9876543210";
  return up.includes(pin) || down.includes(pin);
}

export function pinError(pin: string): string | null {
  if (!pin) return "Set a login PIN.";
  if (!isValidPin(pin)) return "PIN must be 4–6 digits.";
  if (isWeakPin(pin)) return "Too easy to guess — avoid repeated or sequential digits.";
  return null;
}

const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VEHICLE = /^[\p{L}\p{M}\d][\p{L}\p{M}\d .-]*$/u;
const DRIVER_ID = /^[A-Z0-9_-]{2,32}$/;

export type VehicleType = "car" | "bike" | "other";
export type LicenseCategory = "A" | "B" | "AB" | "other";
export type PayoutMethod = "esewa" | "khalti" | "bank";

export const PROVINCES = ["Koshi", "Madhesh", "Bagmati", "Gandaki", "Lumbini", "Karnali", "Sudurpashchim"] as const;
export const LICENSE_CATEGORIES: { value: LicenseCategory; label: string }[] = [
  { value: "A", label: "A — Motorcycle / scooter" },
  { value: "B", label: "B — Car / jeep / van" },
  { value: "AB", label: "A + B — Both" },
  { value: "other", label: "Other" },
];
export const PAYOUT_METHODS: { value: PayoutMethod; label: string }[] = [
  { value: "esewa", label: "eSewa" },
  { value: "khalti", label: "Khalti" },
  { value: "bank", label: "Bank account" },
];

export type DriverData = {
  name: string;
  phone: string;
  email: string | null;
  /** Derived from dateOfBirth when given (kept for older records). */
  age: number | null;
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
  vehicleType: VehicleType;
  vehicleNo: string | null;
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
};

type Source = FormData | Record<string, string>;
const get = (src: Source, key: string) => str(src instanceof FormData ? src.get(key) : src[key]);

const DOC_NO = /^[\p{L}\d][\p{L}\d ./-]*$/u;
const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const yearsSince = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  const now = new Date();
  let years = now.getUTCFullYear() - d.getUTCFullYear();
  if (now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())) years--;
  return years;
};
export const ageFromDob = (iso: string | null | undefined) => (iso && isIsoDate(iso) ? yearsSince(iso) : null);

function dateError(v: string, kind: "past" | "any"): string | null {
  if (!v) return null;
  if (!isIsoDate(v)) return "Pick a valid date.";
  const year = Number(v.slice(0, 4));
  if (year < 1990 || year > 2100) return "That date looks wrong.";
  if (kind === "past" && Date.parse(`${v}T00:00:00Z`) > Date.now()) return "Can't be in the future.";
  return null;
}

const textError = (v: string, max: number, label: string) => (v.length > max ? `Keep ${label} under ${max} characters.` : null);

/** Validates one driver field; used on blur in the browser and by the server. */
export function driverFieldError(field: string, value: string): string | null {
  const v = value.trim();
  switch (field) {
    case "name":
      if (!v) return "Name is required.";
      if (v.length < 2) return "Name is too short.";
      if (v.length > 80) return "Keep the name under 80 characters.";
      if (!NAME.test(v)) return "Use letters only (spaces, dots and hyphens are fine).";
      return null;
    case "phone":
      if (!v) return "Mobile number is required.";
      return normalizePhone(v) ? null : "Enter a 10-digit Nepali mobile number, e.g. 98XXXXXXXX.";
    case "email":
      if (!v) return null;
      if (v.length > 120 || !EMAIL.test(v)) return "Enter a valid email address, or leave it empty.";
      return null;
    case "dateOfBirth": {
      if (!v) return null;
      const e = dateError(v, "past");
      if (e) return e;
      const age = yearsSince(v);
      return age >= 18 && age <= 80 ? null : "Drivers must be between 18 and 80 years old.";
    }
    case "address":
      return textError(v, 200, "the address");
    case "province":
      return !v || (PROVINCES as readonly string[]).includes(v) ? null : "Pick a province from the list.";
    case "district":
      return textError(v, 60, "the district");
    case "municipality":
      return textError(v, 80, "the municipality");
    case "ward": {
      if (!v) return null;
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 35 ? null : "Ward must be a number from 1 to 35.";
    }
    case "emergencyName":
      if (!v) return null;
      return v.length <= 80 && NAME.test(v) ? null : "Use letters only, under 80 characters.";
    case "emergencyPhone":
      if (!v) return null;
      return normalizePhone(v) ? null : "Enter a 10-digit Nepali mobile number.";
    case "citizenshipNo":
    case "licenseNo":
    case "bluebookNo":
      if (!v) return null;
      return v.length <= 30 && DOC_NO.test(v) ? null : "Letters, numbers, spaces, / . or - only (max 30).";
    case "licenseCategory":
      return !v || LICENSE_CATEGORIES.some((c) => c.value === v) ? null : "Pick a license category.";
    case "licenseExpiry":
    case "bluebookExpiry":
    case "insuranceExpiry":
      return dateError(v, "any");
    case "vehicleNo":
      if (!v) return null;
      if (v.length < 3 || v.length > 30 || !VEHICLE.test(v)) return "Use letters, numbers, spaces or hyphens, e.g. Lu 1 Pa 2345.";
      return null;
    case "vehicleBrand":
    case "vehicleModel":
      return textError(v, 40, "this");
    case "vehicleColor":
      return textError(v, 30, "the color");
    case "vehicleYear": {
      if (!v) return null;
      const n = Number(v);
      const max = new Date().getFullYear() + 1;
      return Number.isInteger(n) && n >= 1980 && n <= max ? null : `Year must be between 1980 and ${max}.`;
    }
    case "payoutMethod":
      return !v || PAYOUT_METHODS.some((m) => m.value === v) ? null : "Pick a payout method.";
    case "payoutAccount":
      if (!v) return null;
      return v.length <= 40 && /^[\d -]+$/.test(v) ? null : "Numbers only (spaces and dashes are fine).";
    case "payoutBank":
      return textError(v, 80, "the bank name");
    case "stickerGivenOn":
      return dateError(v, "past");
    case "notes":
      return textError(v, 1000, "notes");
    case "id":
      if (!v) return null;
      if (["DIRECT", "GENERAL"].includes(v.toUpperCase())) return `${v.toUpperCase()} is reserved.`;
      return DRIVER_ID.test(v.toUpperCase()) ? null : "2–32 letters, numbers, - or _ (e.g. DRV120).";
    case "pin":
      return pinError(v);
    default:
      return null;
  }
}

export const DRIVER_FIELDS = [
  "name", "phone", "email", "dateOfBirth", "address", "province", "district", "municipality", "ward",
  "emergencyName", "emergencyPhone", "citizenshipNo", "licenseNo", "licenseCategory", "licenseExpiry",
  "vehicleNo", "vehicleBrand", "vehicleModel", "vehicleColor", "vehicleYear", "bluebookNo", "bluebookExpiry",
  "insuranceExpiry", "payoutMethod", "payoutAccount", "payoutBank", "stickerGivenOn", "notes",
] as const;

const opt = (v: string) => v || null;
const clean = (v: string) => v.replace(/\s+/g, " ") || null;

export function validateDriver(src: Source): Result<DriverData> {
  const errors: FieldErrors = {};
  for (const f of DRIVER_FIELDS) {
    const e = driverFieldError(f, get(src, f));
    if (e) errors[f] = e;
  }
  // Payout details go together.
  const method = get(src, "payoutMethod");
  if (method && !get(src, "payoutAccount") && !errors.payoutAccount) {
    errors.payoutAccount = method === "bank" ? "Enter the account number." : "Enter the wallet mobile number.";
  }
  if ((method === "esewa" || method === "khalti") && get(src, "payoutAccount") && !normalizePhone(get(src, "payoutAccount"))) {
    errors.payoutAccount = "eSewa / Khalti IDs are 10-digit mobile numbers.";
  }
  if (method === "bank" && !get(src, "payoutBank") && !errors.payoutBank) errors.payoutBank = "Enter the bank name.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const vt = get(src, "vehicleType");
  const dob = opt(get(src, "dateOfBirth"));
  const ward = get(src, "ward");
  const year = get(src, "vehicleYear");
  const emergencyPhone = get(src, "emergencyPhone");
  const account = get(src, "payoutAccount");
  return {
    ok: true,
    data: {
      name: get(src, "name").replace(/\s+/g, " "),
      phone: normalizePhone(get(src, "phone"))!,
      email: get(src, "email").toLowerCase() || null,
      age: ageFromDob(dob),
      dateOfBirth: dob,
      address: opt(get(src, "address")),
      province: opt(get(src, "province")),
      district: clean(get(src, "district")),
      municipality: clean(get(src, "municipality")),
      ward: ward ? Number(ward) : null,
      emergencyName: clean(get(src, "emergencyName")),
      emergencyPhone: emergencyPhone ? normalizePhone(emergencyPhone) : null,
      citizenshipNo: clean(get(src, "citizenshipNo")),
      licenseNo: clean(get(src, "licenseNo")),
      licenseCategory: (opt(get(src, "licenseCategory")) as LicenseCategory | null),
      licenseExpiry: opt(get(src, "licenseExpiry")),
      vehicleType: vt === "bike" || vt === "other" ? vt : "car",
      vehicleNo: clean(get(src, "vehicleNo")),
      vehicleBrand: clean(get(src, "vehicleBrand")),
      vehicleModel: clean(get(src, "vehicleModel")),
      vehicleColor: clean(get(src, "vehicleColor")),
      vehicleYear: year ? Number(year) : null,
      bluebookNo: clean(get(src, "bluebookNo")),
      bluebookExpiry: opt(get(src, "bluebookExpiry")),
      insuranceExpiry: opt(get(src, "insuranceExpiry")),
      payoutMethod: (opt(method) as PayoutMethod | null),
      payoutAccount: account ? (method === "bank" ? account.replace(/\s+/g, " ") : normalizePhone(account)) : null,
      payoutBank: method === "bank" ? clean(get(src, "payoutBank")) : null,
      stickerGivenOn: opt(get(src, "stickerGivenOn")),
      trainingDone: get(src, "trainingDone") === "on",
      notes: opt(get(src, "notes")),
    },
  };
}

// ---------- "Drive with us" application (public website) ----------

/** Step 1 of signing up: just enough for the office to call and check the applicant. */
export type ApplicationData = {
  name: string;
  phone: string;
  address: string;
  message: string | null;
};

// Older applications also carry these (the form used to ask for everything up front).
export type Ownership = "own" | "family" | "other";
export const OWNERSHIP_OPTIONS: { value: Ownership; label: string }[] = [
  { value: "own", label: "I own it" },
  { value: "family", label: "Family member's" },
  { value: "other", label: "Someone else's" },
];
export type Availability = "full" | "part" | "weekends";
export const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: "full", label: "Full time" },
  { value: "part", label: "Part time" },
  { value: "weekends", label: "Weekends" },
];

/** Photos sent with an application: 1–4 of the vehicle and one of the driving license. */
export const APPLICATION_PHOTOS = { vehicleMin: 1, vehicleMax: 4 } as const;

export function applicationFieldError(field: string, value: string): string | null {
  const v = value.trim();
  if (field === "address" && !v) return "Address is required.";
  if (field === "message") return textError(v, 500, "the message");
  if (field === "consent") return v === "on" ? null : "Please confirm to continue.";
  return driverFieldError(field, value);
}

const APPLICATION_FIELDS = ["name", "phone", "address", "message", "consent"];

export function validateApplication(src: Source): Result<ApplicationData> {
  const errors: FieldErrors = {};
  for (const f of APPLICATION_FIELDS) {
    const e = applicationFieldError(f, get(src, f));
    if (e) errors[f] = e;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name: get(src, "name").replace(/\s+/g, " "),
      phone: normalizePhone(get(src, "phone"))!,
      address: get(src, "address").replace(/\s+/g, " "),
      message: opt(get(src, "message")),
    },
  };
}

// ---------- Step 2: approved drivers complete their profile (driver portal) ----------

/** What a driver fills in themselves; name, mobile and office-only fields stay with the office. */
export const PROFILE_FIELDS = [
  "email", "dateOfBirth", "citizenshipNo", "address", "district", "municipality", "ward", "emergencyName", "emergencyPhone",
  "licenseNo", "licenseCategory", "licenseExpiry", "vehicleNo", "vehicleBrand", "vehicleModel", "vehicleColor", "vehicleYear",
  "bluebookNo", "bluebookExpiry", "insuranceExpiry", "payoutMethod", "payoutAccount", "payoutBank",
] as const;

export type ProfileData = Pick<DriverData, (typeof PROFILE_FIELDS)[number] | "age" | "vehicleType">;

const PROFILE_REQUIRED: Record<string, string> = {
  dateOfBirth: "Date of birth is required.",
  citizenshipNo: "Citizenship number is required.",
  licenseNo: "License number is required.",
  licenseCategory: "Pick your license category.",
  licenseExpiry: "License expiry date is required.",
  vehicleNo: "Vehicle number is required.",
  bluebookNo: "Bluebook number is required.",
};

const isPast = (v: string) => isIsoDate(v) && Date.parse(`${v}T00:00:00Z`) < Date.now();

export function profileFieldError(field: string, value: string): string | null {
  const v = value.trim();
  if (!v && PROFILE_REQUIRED[field]) return PROFILE_REQUIRED[field];
  if (field === "licenseExpiry" && v && isPast(v)) return "This license has expired.";
  if (field === "insuranceExpiry" && v && isPast(v)) return "This insurance has expired.";
  return driverFieldError(field, value);
}

/**
 * Where a driver is in signing up: filling in their details, waiting for the office to check
 * them, or done (QR code and referral link unlocked).
 */
export type OnboardingStage = "details" | "review" | "done";
export const onboardingStage = (d: { profileComplete: boolean; verified: boolean }): OnboardingStage =>
  !d.profileComplete ? "details" : !d.verified ? "review" : "done";

/** True once a driver has everything step 2 asks for (so they aren't asked again). */
export const isProfileComplete = (d: Partial<Record<string, unknown>>) => Object.keys(PROFILE_REQUIRED).every((k) => d[k] != null && d[k] !== "");

/** Checks the step-2 form; `who` supplies the name and mobile the office already has. */
export function validateProfile(src: Source, who: { name: string; phone: string }): Result<ProfileData> {
  const record: Record<string, string> = { name: who.name, phone: who.phone, vehicleType: get(src, "vehicleType") };
  for (const f of PROFILE_FIELDS) record[f] = get(src, f);
  const errors: FieldErrors = {};
  for (const f of PROFILE_FIELDS) {
    const e = profileFieldError(f, record[f]);
    if (e) errors[f] = e;
  }
  const driver = validateDriver(record);
  if (!driver.ok || Object.keys(errors).length) return { ok: false, errors: { ...(driver.ok ? {} : driver.errors), ...errors } };
  const d = driver.data;
  const data = { age: d.age, vehicleType: d.vehicleType } as ProfileData;
  for (const f of PROFILE_FIELDS) (data as Record<string, unknown>)[f] = d[f];
  return { ok: true, data };
}

// ---------- Ride booking (public website, /nepcab) ----------

export type BookingVehicle = "car" | "bike";

/** Optional quick questions on the booking card (market research for the booking desk). */
export const BOOKING_SURVEY = {
  sharePref: {
    question: "Would you share your ride with others going the same way, to pay less?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "maybe", label: "Maybe" },
      { value: "no", label: "No" },
    ],
  },
  availability: {
    question: "How easy is it to find a ride in your area today?",
    options: [
      { value: "easy", label: "Easy" },
      { value: "sometimes", label: "Sometimes hard" },
      { value: "hard", label: "Very hard" },
    ],
  },
} as const;
export type SurveyKey = keyof typeof BOOKING_SURVEY;
const surveyAnswer = (key: SurveyKey, v: string) => (BOOKING_SURVEY[key].options.some((o) => o.value === v) ? v : null);
export type BookingData = {
  name: string;
  phone: string;
  pickup: string;
  dropoff: string;
  vehicleType: BookingVehicle;
  /** ISO time with the Nepal offset, or null for "as soon as possible". */
  rideAt: string | null;
  note: string | null;
  sharePref: string | null;
  availability: string | null;
};

/** How far ahead a ride can be booked. */
export const BOOKING_MAX_DAYS = 30;

/** "2026-10-15T14:30" from a datetime-local input, read as Nepal time. */
const nepalTime = (v: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v) ? Date.parse(`${v}:00+05:45`) : NaN);

export function bookingFieldError(field: string, value: string, when = "now"): string | null {
  const v = value.trim();
  switch (field) {
    case "pickup":
    case "dropoff": {
      const label = field === "pickup" ? "pickup" : "drop-off";
      if (!v) return `Enter your ${label} location.`;
      if (v.length < 3) return `Add a bit more detail to the ${label}.`;
      return v.length > 150 ? `Keep the ${label} under 150 characters.` : null;
    }
    case "rideAt": {
      if (when !== "later") return null;
      if (!v) return "Pick a date and time.";
      const t = nepalTime(v);
      if (Number.isNaN(t)) return "Pick a valid date and time.";
      if (t < Date.now() + 10 * 60_000) return "Pick a time at least 10 minutes from now.";
      if (t > Date.now() + BOOKING_MAX_DAYS * 86_400_000) return `You can book up to ${BOOKING_MAX_DAYS} days ahead.`;
      return null;
    }
    case "note":
      return textError(v, 300, "the note");
    default:
      return driverFieldError(field, value);
  }
}

export function validateBooking(src: Source): Result<BookingData> {
  const when = get(src, "when") === "later" ? "later" : "now";
  const errors: FieldErrors = {};
  for (const f of ["pickup", "dropoff", "rideAt", "name", "phone", "note"]) {
    const e = bookingFieldError(f, get(src, f), when);
    if (e) errors[f] = e;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name: get(src, "name").replace(/\s+/g, " "),
      phone: normalizePhone(get(src, "phone"))!,
      pickup: get(src, "pickup").replace(/\s+/g, " "),
      dropoff: get(src, "dropoff").replace(/\s+/g, " "),
      vehicleType: get(src, "vehicleType") === "bike" ? "bike" : "car",
      rideAt: when === "later" ? `${get(src, "rideAt")}:00+05:45` : null,
      note: opt(get(src, "note")),
      sharePref: surveyAnswer("sharePref", get(src, "sharePref")),
      availability: surveyAnswer("availability", get(src, "availability")),
    },
  };
}

// ---------- Contact form (public website) ----------

export const CONTACT_TOPICS = [
  { value: "general", label: "General question" },
  { value: "service", label: "A Praja Ride service" },
  { value: "rider", label: "Rides / riding with NepCab" },
  { value: "driver", label: "Driving with us" },
  { value: "business", label: "Business / partnership" },
  { value: "careers", label: "Careers / job application" },
  { value: "lost", label: "Lost item" },
  { value: "safety", label: "Safety concern / complaint" },
] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export type ContactData = {
  name: string;
  phone: string | null;
  email: string | null;
  topic: string;
  message: string;
  /** Business enquiries: the organization's name. */
  organization: string | null;
  /** Service: which service; careers: the role; business: the kind of enquiry; lost item / safety: date and vehicle. */
  subject: string | null;
};

export function contactFieldError(field: string, value: string): string | null {
  const v = value.trim();
  switch (field) {
    case "name":
      if (!v) return "Please tell us your name.";
      return v.length <= 80 ? null : "Keep the name under 80 characters.";
    case "phone":
      if (!v) return null;
      return normalizePhone(v) ? null : "Enter a 10-digit Nepali mobile number.";
    case "email":
      if (!v) return null;
      return v.length <= 120 && EMAIL.test(v) ? null : "Enter a valid email address.";
    case "topic":
      return CONTACT_TOPICS.some((t) => t.value === v) ? null : "Pick a topic.";
    case "message":
      if (v.length < 10) return "Please write at least 10 characters.";
      return v.length <= 1000 ? null : "Keep it under 1000 characters.";
    case "organization":
      return v.length <= 100 ? null : "Keep it under 100 characters.";
    case "subject":
      return v.length <= 120 ? null : "Keep it under 120 characters.";
    default:
      return null;
  }
}

export function validateContact(src: Source): Result<ContactData> {
  const errors: FieldErrors = {};
  for (const f of ["name", "phone", "email", "topic", "message", "organization", "subject"]) {
    const e = contactFieldError(f, get(src, f));
    if (e) errors[f] = e;
  }
  if (get(src, "topic") === "business" && !get(src, "organization") && !errors.organization) errors.organization = "Tell us your organization's name.";
  if (!get(src, "phone") && !get(src, "email") && !errors.phone) errors.phone = "Give a phone number or email so we can reply.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      name: get(src, "name").replace(/\s+/g, " "),
      phone: get(src, "phone") ? normalizePhone(get(src, "phone")) : null,
      email: get(src, "email").toLowerCase() || null,
      topic: get(src, "topic"),
      message: get(src, "message"),
      organization: get(src, "organization").replace(/\s+/g, " ") || null,
      subject: get(src, "subject").replace(/\s+/g, " ") || null,
    },
  };
}

export type TierData = { target: number; reward: string; amountNpr: number; active: boolean };

export function tierFieldError(field: string, value: string): string | null {
  const v = value.trim();
  switch (field) {
    case "target": {
      const n = Number(v);
      if (!v) return "Required.";
      return Number.isInteger(n) && n >= 1 && n <= 100000 ? null : "Whole number, 1 or more.";
    }
    case "reward":
      if (!v) return "Describe the reward.";
      return v.length > 120 ? "Under 120 characters." : null;
    case "amountNpr": {
      const n = Number(v || 0);
      return Number.isInteger(n) && n >= 0 && n <= 1_000_000 ? null : "Whole rupees, 0 or more.";
    }
    default:
      return null;
  }
}

export function validateTier(src: Source): Result<TierData> {
  const errors: FieldErrors = {};
  for (const f of ["target", "reward", "amountNpr"]) {
    const e = tierFieldError(f, get(src, f));
    if (e) errors[f] = e;
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: {
      target: Number(get(src, "target")),
      reward: get(src, "reward"),
      amountNpr: Number(get(src, "amountNpr") || 0),
      active: get(src, "active") === "on",
    },
  };
}

export function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Email is required.";
  return EMAIL.test(v) ? null : "Enter a valid email address.";
}

/**
 * Number in the format wa.me expects (country code + number, digits only), or null.
 * Nepali mobiles can be typed without +977; other countries need a leading + (or 00).
 */
export function whatsappNumber(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const np = normalizePhone(v);
  if (np) return `977${np}`;
  if (!/^(\+|00)/.test(v)) return null;
  const digits = v.replace(/\D/g, "").replace(/^00/, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function whatsappError(raw: string): string | null {
  if (!raw.trim()) return "Enter a WhatsApp number.";
  return whatsappNumber(raw) ? null : "Use a 10-digit Nepali mobile (98XXXXXXXX) or an international number starting with +.";
}
