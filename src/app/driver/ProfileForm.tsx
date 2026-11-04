"use client";

import { useActionState, useState } from "react";
import { Bike, Car, Check, Loader2, MoreHorizontal } from "lucide-react";
import { Field, FormAlert, FormSection, useFormValidation } from "@/components/admin/form";
import { useHydrated } from "@/components/SubmitButton";
import type { Driver } from "@/lib/drivers";
import { LICENSE_CATEGORIES, PAYOUT_METHODS, profileFieldError } from "@/lib/validation";
import { completeProfileAction, type ProfileState } from "./actions";
import { Select } from "@/components/Select";

// Step 2 of signing up: shown in the driver portal until an approved driver has filled in their
// documents and vehicle details. Pre-filled with anything the office already entered.

const VEHICLES = [
  { value: "car", label: "Car", icon: Car },
  { value: "bike", label: "Bike", icon: Bike },
  { value: "other", label: "Other", icon: MoreHorizontal },
] as const;

export function ProfileForm({ driver: d }: { driver: Driver }) {
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState<ProfileState, FormData>(completeProfileAction, {});
  const v = useFormValidation(profileFieldError, state.fieldErrors);
  const val = (key: string, fallback?: string | number | null) => state.values?.[key] ?? (fallback == null ? "" : String(fallback));
  const [vehicleType, setVehicleType] = useState(val("vehicleType", d.vehicleType));
  const [payout, setPayout] = useState(val("payoutMethod", d.payoutMethod));
  const common = { onBlur: v.onBlur, onChange: v.onChange };
  const e = v.errors;

  return (
    <form action={action} onSubmit={v.onSubmit} noValidate className="space-y-8">
      {state.error && <FormAlert>{state.error}</FormAlert>}

      <FormSection title="About you">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of birth" name="dateOfBirth" required error={e.dateOfBirth}>
            {(p) => <input {...p} {...common} type="date" defaultValue={val("dateOfBirth", d.dateOfBirth)} />}
          </Field>
          <Field label="Citizenship number" name="citizenshipNo" required error={e.citizenshipNo}>
            {(p) => <input {...p} {...common} defaultValue={val("citizenshipNo", d.citizenshipNo)} maxLength={30} placeholder="As on your citizenship" />}
          </Field>
        </div>
        <Field label="Email" name="email" error={e.email}>
          {(p) => <input {...p} {...common} type="email" defaultValue={val("email", d.email)} autoComplete="email" placeholder="name@example.com" />}
        </Field>
      </FormSection>

      <FormSection title="Address">
        <Field label="Street / tole" name="address" error={e.address}>
          {(p) => <input {...p} {...common} defaultValue={val("address", d.address)} maxLength={200} placeholder="e.g. Golpark, near Traffic Chowk" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="District" name="district" error={e.district}>
            {(p) => <input {...p} {...common} defaultValue={val("district", d.district ?? "Rupandehi")} maxLength={60} />}
          </Field>
          <Field label="Municipality" name="municipality" error={e.municipality}>
            {(p) => <input {...p} {...common} defaultValue={val("municipality", d.municipality ?? "Butwal Sub-Metropolitan")} maxLength={80} />}
          </Field>
          <Field label="Ward" name="ward" error={e.ward}>
            {(p) => <input {...p} {...common} type="number" inputMode="numeric" min={1} max={35} defaultValue={val("ward", d.ward)} placeholder="1–35" />}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Emergency contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" name="emergencyName" error={e.emergencyName}>
            {(p) => <input {...p} {...common} defaultValue={val("emergencyName", d.emergencyName)} maxLength={80} placeholder="Family member or friend" />}
          </Field>
          <Field label="Mobile" name="emergencyPhone" error={e.emergencyPhone}>
            {(p) => <input {...p} {...common} defaultValue={val("emergencyPhone", d.emergencyPhone)} inputMode="tel" placeholder="98XXXXXXXX" />}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Driving license">
        <Field label="License number" name="licenseNo" required error={e.licenseNo}>
          {(p) => <input {...p} {...common} defaultValue={val("licenseNo", d.licenseNo)} maxLength={30} placeholder="e.g. 01-06-12345678" />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" name="licenseCategory" required error={e.licenseCategory}>
            {(p) => (
              <Select {...p} {...common} defaultValue={val("licenseCategory", d.licenseCategory)}>
                <option value="">Choose…</option>
                {LICENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Expiry date" name="licenseExpiry" required error={e.licenseExpiry}>
            {(p) => <input {...p} {...common} type="date" defaultValue={val("licenseExpiry", d.licenseExpiry)} />}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Your vehicle">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Vehicle type">
          {VEHICLES.map(({ value, label, icon: Icon }) => (
            <label
              key={value}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                vehicleType === value ? "border-ink bg-ink text-white shadow-sm" : "border-ink/15 bg-white text-ink/70 hover:border-ink/30"
              }`}
            >
              <input type="radio" name="vehicleType" value={value} checked={vehicleType === value} onChange={() => setVehicleType(value)} className="sr-only" />
              <Icon className="h-4 w-4" /> {label}
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vehicle number" name="vehicleNo" required error={e.vehicleNo}>
            {(p) => <input {...p} {...common} defaultValue={val("vehicleNo", d.vehicleNo)} maxLength={30} placeholder="e.g. Lu 1 Pa 2345" />}
          </Field>
          <Field label="Bluebook number" name="bluebookNo" required error={e.bluebookNo}>
            {(p) => <input {...p} {...common} defaultValue={val("bluebookNo", d.bluebookNo)} maxLength={30} placeholder="As on the bluebook" />}
          </Field>
          <Field label="Brand" name="vehicleBrand" error={e.vehicleBrand}>
            {(p) => <input {...p} {...common} defaultValue={val("vehicleBrand", d.vehicleBrand)} maxLength={40} placeholder="e.g. Hyundai, Honda" />}
          </Field>
          <Field label="Model" name="vehicleModel" error={e.vehicleModel}>
            {(p) => <input {...p} {...common} defaultValue={val("vehicleModel", d.vehicleModel)} maxLength={40} placeholder="e.g. i10, Shine" />}
          </Field>
          <Field label="Colour" name="vehicleColor" error={e.vehicleColor}>
            {(p) => <input {...p} {...common} defaultValue={val("vehicleColor", d.vehicleColor)} maxLength={30} placeholder="e.g. White" />}
          </Field>
          <Field label="Year" name="vehicleYear" error={e.vehicleYear}>
            {(p) => <input {...p} {...common} type="number" inputMode="numeric" min={1980} defaultValue={val("vehicleYear", d.vehicleYear)} placeholder="e.g. 2019" />}
          </Field>
          <Field label="Bluebook renewal date" name="bluebookExpiry" error={e.bluebookExpiry}>
            {(p) => <input {...p} {...common} type="date" defaultValue={val("bluebookExpiry", d.bluebookExpiry)} />}
          </Field>
          <Field label="Insurance valid until" name="insuranceExpiry" error={e.insuranceExpiry}>
            {(p) => <input {...p} {...common} type="date" defaultValue={val("insuranceExpiry", d.insuranceExpiry)} />}
          </Field>
        </div>
      </FormSection>

      <FormSection title="Reward payouts" description="Where your referral rewards are paid. You can add this later through the office.">
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
              <option value="">Not now</option>
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
              {(p) => <input {...p} {...common} defaultValue={val("payoutAccount", d.payoutAccount)} inputMode="numeric" maxLength={40} placeholder={payout === "bank" ? "Account number" : "98XXXXXXXX"} />}
            </Field>
            {payout === "bank" && (
              <Field label="Bank name" name="payoutBank" required error={e.payoutBank}>
                {(p) => <input {...p} {...common} defaultValue={val("payoutBank", d.payoutBank)} maxLength={80} placeholder="e.g. Nabil Bank, Butwal" />}
              </Field>
            )}
          </div>
        )}
      </FormSection>

      <button
        disabled={pending || !hydrated}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-lg font-semibold text-white disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Save and continue
      </button>
    </form>
  );
}
