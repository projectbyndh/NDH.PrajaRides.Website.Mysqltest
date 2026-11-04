"use client";

import { useHydrated } from "@/components/SubmitButton";
import { useActionState } from "react";
import { KeyRound, Loader2, Phone } from "lucide-react";
import { driverLoginAction, type DriverLoginState } from "../actions";

const field = "flex items-center gap-2 rounded-xl border border-ink/15 bg-white px-3 focus-within:ring-2 focus-within:ring-brand";

export function DriverLoginForm() {
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState<DriverLoginState, FormData>(driverLoginAction, {});
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Mobile number</span>
        <div className={`mt-1 ${field}`}>
          <Phone className="h-4 w-4 text-ink/50" />
          <input
            name="phone"
            defaultValue={state.phone}
            inputMode="tel"
            autoComplete="tel"
            placeholder="98XXXXXXXX"
            required
            className="w-full bg-transparent py-3 text-lg outline-none"
          />
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium">PIN</span>
        <div className={`mt-1 ${field}`}>
          <KeyRound className="h-4 w-4 text-ink/50" />
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            pattern="\d{4,6}"
            maxLength={6}
            required
            className="w-full bg-transparent py-3 font-mono text-lg tracking-[0.4em] outline-none"
          />
        </div>
      </label>
      {state.error && <p className="text-sm font-medium text-pin">{state.error}</p>}
      <button
        disabled={pending || !hydrated}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3.5 text-lg font-semibold text-white disabled:opacity-60"
      >
        {pending && <Loader2 className="h-5 w-5 animate-spin" />} Log in
      </button>
    </form>
  );
}
