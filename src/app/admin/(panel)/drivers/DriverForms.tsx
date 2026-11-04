"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bike, Car, Check, ChevronDown, Copy, Eye, EyeOff, KeyRound, Loader2, MoreHorizontal, Send, Shuffle, UserPlus } from "lucide-react";
import { Drawer, Field, FormAlert, FormSection, useFormValidation } from "@/components/admin/form";
import { btn } from "@/components/admin/ui";
import { useHydrated } from "@/components/SubmitButton";
import type { Driver } from "@/lib/drivers";
import { useIdentity } from "@/components/IdentityProvider";
import { driverWelcomeMessage } from "@/lib/messages";
import { driverFieldError, isWeakPin, LICENSE_CATEGORIES, PAYOUT_METHODS, PROVINCES, whatsappNumber } from "@/lib/validation";
import { createDriverAction, resetPinAction, updateDriverAction, type FormState } from "./actions";
import { Select } from "@/components/Select";

export function randomPin(): string {
  for (;;) {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    if (!isWeakPin(pin)) return pin;
  }
}

const check = (field: string, value: string) => driverFieldError(field, value);

type V = ReturnType<typeof useFormValidation>;

function PinInput({ v, label = "Login PIN", initial = "" }: { v: V; label?: string; initial?: string }) {
  const [pin, setPinValue] = useState(initial);
  const [show, setShow] = useState(true);
  return (
    <Field label={label} name="pin" required error={v.errors.pin} hint="4–6 digits. The driver logs in with their mobile number and this PIN.">
      {(p) => (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              {...p}
              value={pin}
              onChange={(e) => {
                setPinValue(e.target.value.replace(/\D/g, "").slice(0, 6));
                v.onChange(e);
              }}
              onBlur={v.onBlur}
              type={show ? "text" : "password"}
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 4829"
              className={`${p.className} pr-10 font-mono text-lg tracking-[0.35em]`}
            />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 px-3 text-ink/40 hover:text-ink" aria-label={show ? "Hide PIN" : "Show PIN"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = randomPin();
              setPinValue(next);
              v.onChange({ target: { name: "pin", value: next } as unknown as EventTarget });
            }}
            className={btn.secondary}
            title="Generate a random PIN"
          >
            <Shuffle className="h-4 w-4" /> <span className="hidden sm:inline">Generate</span>
          </button>
        </div>
      )}
    </Field>
  );
}

const VEHICLES = [
  { value: "car", label: "Car", icon: Car },
  { value: "bike", label: "Bike", icon: Bike },
  { value: "other", label: "Other", icon: MoreHorizontal },
] as const;

type Vals = Record<string, string> | undefined;

/**
 * All driver fields. `quick` (approving a website application): only name, mobile and address
 * show; everything else sits in a collapsed "Add more details" section, since the driver fills
 * it in themselves after logging in.
 */
function DriverFields({ v, d, values, quick = false }: { v: V; d?: Driver; values?: Vals; quick?: boolean }) {
  const val = (key: string, fallback?: string | number | null) => values?.[key] ?? (fallback == null ? "" : String(fallback));
  const common = { onBlur: v.onBlur, onChange: v.onChange };
  const [vehicleType, setVehicleType] = useState(val("vehicleType", d?.vehicleType ?? "car"));
  const [payout, setPayout] = useState(val("payoutMethod", d?.payoutMethod));
  const e = v.errors;

  const nameField = (
    <Field label="Full name" name="name" required error={e.name}>
      {(p) => <input {...p} {...common} defaultValue={val("name", d?.name)} maxLength={80} autoComplete="off" placeholder="e.g. Ram Bahadur Thapa" />}
    </Field>
  );
  const phoneField = (
    <Field label="Mobile number" name="phone" required error={e.phone} hint="Used to log in to the driver portal.">
      {(p) => <input {...p} {...common} defaultValue={val("phone", d?.phone)} inputMode="tel" autoComplete="off" placeholder="98XXXXXXXX" />}
    </Field>
  );
  const dobField = (
    <Field label="Date of birth" name="dateOfBirth" error={e.dateOfBirth} hint="Must be 18–80 years old.">
      {(p) => <input {...p} {...common} type="date" defaultValue={val("dateOfBirth", d?.dateOfBirth)} />}
    </Field>
  );
  const streetField = (
    <Field label={quick ? "Address" : "Street / tole"} name="address" error={e.address}>
      {(p) => <input {...p} {...common} defaultValue={val("address", d?.address)} maxLength={200} placeholder="e.g. Golpark, near Traffic Chowk" />}
    </Field>
  );
  const idFields = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Email" name="email" error={e.email}>
        {(p) => <input {...p} {...common} defaultValue={val("email", d?.email)} type="email" autoComplete="off" placeholder="name@example.com" />}
      </Field>
      <Field label="Citizenship number" name="citizenshipNo" error={e.citizenshipNo}>
        {(p) => <input {...p} {...common} defaultValue={val("citizenshipNo", d?.citizenshipNo)} maxLength={30} placeholder="e.g. 49-01-75-01234" />}
      </Field>
    </div>
  );
  const addressSection = (street: ReactNode) => (
    <FormSection title="Address">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Province" name="province" error={e.province}>
          {(p) => (
            <Select {...p} {...common} defaultValue={val("province", d?.province ?? "Lumbini")}>
              <option value="">—</option>
              {PROVINCES.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="District" name="district" error={e.district}>
          {(p) => <input {...p} {...common} defaultValue={val("district", d?.district ?? "Rupandehi")} maxLength={60} placeholder="e.g. Rupandehi" />}
        </Field>
        <Field label="Municipality" name="municipality" error={e.municipality}>
          {(p) => <input {...p} {...common} defaultValue={val("municipality", d?.municipality)} maxLength={80} placeholder="e.g. Butwal Sub-Metropolitan" />}
        </Field>
        <Field label="Ward" name="ward" error={e.ward}>
          {(p) => <input {...p} {...common} defaultValue={val("ward", d?.ward)} type="number" inputMode="numeric" min={1} max={35} placeholder="1–35" />}
        </Field>
      </div>
      {street}
    </FormSection>
  );
  const rest = (
    <>
      <FormSection title="Emergency contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" name="emergencyName" error={e.emergencyName}>
            {(p) => <input {...p} {...common} defaultValue={val("emergencyName", d?.emergencyName)} maxLength={80} placeholder="Family member" />}
          </Field>
          <Field label="Mobile" name="emergencyPhone" error={e.emergencyPhone}>
            {(p) => <input {...p} {...common} defaultValue={val("emergencyPhone", d?.emergencyPhone)} inputMode="tel" placeholder="98XXXXXXXX" />}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Driving license">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="License number" name="licenseNo" error={e.licenseNo}>
            {(p) => <input {...p} {...common} defaultValue={val("licenseNo", d?.licenseNo)} maxLength={30} placeholder="e.g. 01-06-12345678" />}
          </Field>
          <Field label="Category" name="licenseCategory" error={e.licenseCategory}>
            {(p) => (
              <Select {...p} {...common} defaultValue={val("licenseCategory", d?.licenseCategory)}>
                <option value="">—</option>
                {LICENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Expiry date" name="licenseExpiry" error={e.licenseExpiry} hint="You'll get an alert 30 days before.">
            {(p) => <input {...p} {...common} type="date" defaultValue={val("licenseExpiry", d?.licenseExpiry)} />}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Vehicle">
        <div>
          <span className="mb-1.5 block text-sm font-semibold">Type</span>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vehicle type">
            {VEHICLES.map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  vehicleType === value ? "border-ink bg-ink text-white shadow-sm" : "border-ink/15 bg-white text-ink/70 hover:border-ink/30"
                }`}
              >
                <input type="radio" name="vehicleType" value={value} checked={vehicleType === value} onChange={() => setVehicleType(value)} className="sr-only" />
                <Icon className="h-4 w-4" /> {label}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vehicle number" name="vehicleNo" error={e.vehicleNo}>
            {(p) => <input {...p} {...common} defaultValue={val("vehicleNo", d?.vehicleNo)} maxLength={30} placeholder="e.g. Lu 1 Pa 2345" />}
          </Field>
          <Field label="Brand" name="vehicleBrand" error={e.vehicleBrand}>
            {(p) => <input {...p} {...common} defaultValue={val("vehicleBrand", d?.vehicleBrand)} maxLength={40} placeholder="e.g. Hyundai, Honda" />}
          </Field>
          <Field label="Model" name="vehicleModel" error={e.vehicleModel}>
            {(p) => <input {...p} {...common} defaultValue={val("vehicleModel", d?.vehicleModel)} maxLength={40} placeholder="e.g. i10, Shine" />}
          </Field>
          <Field label="Color" name="vehicleColor" error={e.vehicleColor}>
            {(p) => <input {...p} {...common} defaultValue={val("vehicleColor", d?.vehicleColor)} maxLength={30} placeholder="e.g. White" />}
          </Field>
          <Field label="Year" name="vehicleYear" error={e.vehicleYear}>
            {(p) => <input {...p} {...common} defaultValue={val("vehicleYear", d?.vehicleYear)} type="number" inputMode="numeric" min={1980} placeholder="e.g. 2021" />}
          </Field>
          <Field label="Bluebook number" name="bluebookNo" error={e.bluebookNo}>
            {(p) => <input {...p} {...common} defaultValue={val("bluebookNo", d?.bluebookNo)} maxLength={30} />}
          </Field>
          <Field label="Bluebook renewal date" name="bluebookExpiry" error={e.bluebookExpiry}>
            {(p) => <input {...p} {...common} type="date" defaultValue={val("bluebookExpiry", d?.bluebookExpiry)} />}
          </Field>
          <Field label="Insurance expiry" name="insuranceExpiry" error={e.insuranceExpiry}>
            {(p) => <input {...p} {...common} type="date" defaultValue={val("insuranceExpiry", d?.insuranceExpiry)} />}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Reward payouts" description="Where referral rewards are paid.">
        <Field label="Method" name="payoutMethod" error={e.payoutMethod}>
          {(p) => (
            <Select
              {...p}
              {...common}
              value={payout}
              onChange={(ev) => {
                setPayout(ev.target.value);
                common.onChange(ev);
              }}
            >
              <option value="">Not set</option>
              {PAYOUT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {payout && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={payout === "bank" ? "Account number" : `${payout === "esewa" ? "eSewa" : "Khalti"} mobile number`} name="payoutAccount" required error={e.payoutAccount}>
              {(p) => <input {...p} {...common} defaultValue={val("payoutAccount", d?.payoutAccount)} inputMode="numeric" maxLength={40} placeholder={payout === "bank" ? "Account number" : "98XXXXXXXX"} />}
            </Field>
            {payout === "bank" && (
              <Field label="Bank name" name="payoutBank" required error={e.payoutBank}>
                {(p) => <input {...p} {...common} defaultValue={val("payoutBank", d?.payoutBank)} maxLength={80} placeholder="e.g. Nabil Bank, Butwal" />}
              </Field>
            )}
          </div>
        )}
      </FormSection>

      <FormSection title="Onboarding">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="QR sticker given on" name="stickerGivenOn" error={e.stickerGivenOn}>
            {(p) => <input {...p} {...common} type="date" defaultValue={val("stickerGivenOn", d?.stickerGivenOn)} />}
          </Field>
          <label className="mt-7 flex items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" name="trainingDone" defaultChecked={values ? values.trainingDone === "on" : d?.trainingDone} className="h-4 w-4 accent-ink" />
            Training completed
          </label>
        </div>
        <Field label="Notes (admin only)" name="notes" error={e.notes}>
          {(p) => <textarea {...p} {...common} defaultValue={val("notes", d?.notes)} rows={3} maxLength={1000} placeholder="Anything the office should know" />}
        </Field>
      </FormSection>
    </>
  );

  if (quick) {
    // Open the extra details when the server flags a problem in them, so the error is visible.
    const extraError = Object.keys(e).some((k) => !["name", "phone", "address", "id", "pin"].includes(k));
    return (
      <div className="space-y-8">
        <FormSection title="Applicant">
          {nameField}
          {phoneField}
          {streetField}
        </FormSection>
        <details open={extraError} className="group rounded-2xl border border-ink/10 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-sm font-bold">Add more details</span>
              <span className="block text-xs text-ink/55">Optional. The driver fills these in after logging in.</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-ink/40 transition group-open:rotate-180" />
          </summary>
          <div className="space-y-8 border-t border-ink/10 px-4 py-5">
            <FormSection title="Personal details">
              {dobField}
              {idFields}
            </FormSection>
            {addressSection(null)}
            {rest}
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <FormSection title="Personal details">
        {nameField}
        <div className="grid gap-4 sm:grid-cols-2">
          {phoneField}
          {dobField}
        </div>
        {idFields}
      </FormSection>
      {addressSection(streetField)}
      {rest}
    </div>
  );
}

function Credentials({ c, portalUrl, title }: { c: NonNullable<FormState["credentials"]>; portalUrl: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const identity = useIdentity();
  const baseUrl = portalUrl.replace(/\/driver$/, "");
  const text = driverWelcomeMessage({ baseUrl, driverId: c.id, name: c.name, phone: c.phone, pin: c.pin, code: c.code, needsProfile: c.needsProfile }, identity);
  const waUrl = `https://wa.me/${whatsappNumber(c.phone)}?text=${encodeURIComponent(text)}`;
  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white">
      <div className="flex items-center gap-2 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
        <Check className="h-4 w-4" /> {title}
      </div>
      <div className="space-y-3 p-4">
        <p className="text-sm text-ink/65">
          Share these with <b className="text-ink">{c.name}</b>. The PIN won&apos;t be shown again.
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-xl bg-ink/[0.03] p-4 text-sm">
          <dt className="text-ink/50">Portal</dt>
          <dd className="truncate font-semibold">{portalUrl}</dd>
          <dt className="text-ink/50">Mobile</dt>
          <dd className="font-semibold">{c.phone}</dd>
          <dt className="text-ink/50">PIN</dt>
          <dd className="font-mono text-lg font-bold tracking-[0.3em]">{c.pin}</dd>
          <dt className="text-ink/50">Driver ID</dt>
          <dd className="font-semibold">{c.id}</dd>
        </dl>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className={`${btn.secondary} w-full`}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy login details"}
        </button>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25d366] py-2.5 text-sm font-bold text-[#073b2a] shadow-sm transition hover:bg-[#20bd5a]"
        >
          <Send className="h-4 w-4" /> Send login on WhatsApp to {c.phone}
        </a>
        <p className="text-center text-[11px] text-ink/45">
          {c.needsProfile
            ? "Includes the portal link, mobile number and PIN. Their QR and referral link unlock after you verify their details."
            : "Includes the portal link, mobile number, PIN, QR and referral link."}
        </p>
      </div>
    </div>
  );
}

/** "Add driver" button + slide-over form. Opens automatically when `prefillId` is set (?new=DRV107). */
export function AddDriverPanel({ prefillId, nextId, portalUrl }: { prefillId?: string; nextId: string; portalUrl: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(!!prefillId);
  const [round, setRound] = useState(0);
  const close = () => {
    setOpen(false);
    if (prefillId) router.replace("/admin/drivers");
  };
  return (
    <>
      <button onClick={() => { setRound((r) => r + 1); setOpen(true); }} disabled={!hydrated} className={btn.brand}>
        <UserPlus className="h-4 w-4" /> Add driver
      </button>
      <Drawer open={open} onClose={close} title="Add a driver" description="Creates their profile and portal login. Fields marked * are required.">
        <AddDriverForm key={round} prefillId={prefillId} nextId={nextId} portalUrl={portalUrl} onDone={close} onAnother={() => setRound((r) => r + 1)} />
      </Drawer>
    </>
  );
}

/**
 * The add-driver form. `initial` pre-fills it (e.g. from a website application) and
 * `applicationId` marks that application approved once the driver is created.
 */
export function AddDriverForm({
  prefillId,
  nextId,
  portalUrl,
  onDone,
  onAnother,
  initial,
  applicationId,
  initialPin,
}: {
  prefillId?: string;
  nextId: string;
  portalUrl: string;
  onDone: () => void;
  onAnother?: () => void;
  initial?: Record<string, string>;
  applicationId?: string;
  /** Pre-filled login PIN (approving an application: one click, the office can still change it). */
  initialPin?: string;
}) {
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState<FormState, FormData>(createDriverAction, {});
  const v = useFormValidation(check, state.fieldErrors);

  if (state.credentials) {
    return (
      <div className="space-y-4">
        <Credentials c={state.credentials} portalUrl={portalUrl} title={`${state.credentials.name} added as ${state.credentials.id}`} />
        <div className={`grid gap-2 ${onAnother ? "grid-cols-2" : ""}`}>
          {onAnother && (
            <button onClick={onAnother} className={btn.secondary}>
              <UserPlus className="h-4 w-4" /> Add another
            </button>
          )}
          <button onClick={onDone} className={btn.primary}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} onSubmit={v.onSubmit} noValidate className="space-y-8">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {applicationId && <input type="hidden" name="applicationId" value={applicationId} />}
      <DriverFields v={v} values={state.values ?? initial} quick={!!applicationId} />
      <FormSection title="Login" description="The driver ID is printed on their QR sticker.">
        <Field
          label="Driver ID"
          name="id"
          error={v.errors.id}
          hint={prefillId ? `Keeps the scans already recorded for ${prefillId}.` : `Leave empty to use ${nextId}.`}
        >
          {(p) => (
            <input {...p} onBlur={v.onBlur} onChange={v.onChange} defaultValue={state.values?.id ?? prefillId ?? ""} placeholder={nextId} maxLength={32} className={`${p.className} uppercase`} />
          )}
        </Field>
        <PinInput v={v} initial={initialPin} />
      </FormSection>
      <div className="sticky -bottom-6 -mx-6 -mb-6 flex gap-2 border-t border-ink/10 bg-[#fbfaf7]/95 px-6 py-4 backdrop-blur">
        <button type="button" onClick={onDone} className={btn.secondary}>
          Cancel
        </button>
        <button disabled={pending || !hydrated} className={`${btn.primary} flex-1`}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : applicationId ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />} {applicationId ? "Approve" : "Add driver"}
        </button>
      </div>
    </form>
  );
}

export function EditDriverForm({ driver, onSaved }: { driver: Driver; onSaved?: () => void }) {
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const res = await updateDriverAction(driver.id, prev, fd);
    if (res.saved) onSaved?.();
    return res;
  }, {});
  const v = useFormValidation(check, state.fieldErrors);
  const [active, setActive] = useState(driver.active);

  return (
    <form action={action} onSubmit={v.onSubmit} noValidate className="space-y-8">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      <DriverFields v={v} d={driver} values={state.values} />

      <FormSection title="Status">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 bg-ink/[0.02] p-4">
          <span className="relative mt-0.5 inline-flex">
            <input type="checkbox" name="active" checked={active} onChange={(e) => setActive(e.target.checked)} className="peer sr-only" />
            <span className="h-6 w-11 rounded-full bg-ink/20 transition peer-checked:bg-emerald-500 peer-focus-visible:ring-4 peer-focus-visible:ring-brand/30" />
            <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
          </span>
          <span className="text-sm">
            <span className="block font-semibold">{active ? "Active" : "Inactive"}</span>
            <span className="text-ink/55">Inactive drivers can&apos;t log in and don&apos;t earn rewards. Their history is kept.</span>
          </span>
        </label>
      </FormSection>

      <div className="flex items-center gap-3 border-t border-ink/[0.06] pt-5">
        <button disabled={pending || !hydrated} className={btn.primary}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
        </button>
        {state.saved && !pending && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </form>
  );
}

export function ResetPinForm({ driverId, portalUrl }: { driverId: string; portalUrl: string }) {
  const hydrated = useHydrated();
  const [round, setRound] = useState(0);
  return <ResetPinRound key={round} driverId={driverId} portalUrl={portalUrl} hydrated={hydrated} onAgain={() => setRound((r) => r + 1)} />;
}

function ResetPinRound({ driverId, portalUrl, hydrated, onAgain }: { driverId: string; portalUrl: string; hydrated: boolean; onAgain: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPinAction.bind(null, driverId), {});
  const v = useFormValidation(check, state.fieldErrors);
  if (state.credentials) {
    return (
      <div className="space-y-3">
        <Credentials c={state.credentials} portalUrl={portalUrl} title="New PIN set" />
        <button onClick={onAgain} className={`${btn.ghost} w-full`}>
          Done
        </button>
      </div>
    );
  }
  return (
    <form action={action} onSubmit={v.onSubmit} noValidate className="space-y-4">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      <PinInput v={v} label="New PIN" />
      <button disabled={pending || !hydrated} className={`${btn.secondary} w-full`}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Set new PIN
      </button>
    </form>
  );
}
