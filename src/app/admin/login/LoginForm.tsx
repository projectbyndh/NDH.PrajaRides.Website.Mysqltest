"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Field, FormAlert, useFormValidation } from "@/components/admin/form";
import { useHydrated } from "@/components/SubmitButton";
import { emailError } from "@/lib/validation";
import { login, type LoginState } from "../actions";

// Only this hidden field reads the URL, so the rest of the form is in the static HTML.
function NextField() {
  return <input type="hidden" name="next" value={useSearchParams().get("next") ?? "/admin"} />;
}

const check = (field: string, value: string) =>
  field === "email" ? emailError(value) : field === "password" && !value ? "Password is required." : null;

export function LoginForm() {
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const v = useFormValidation(check);
  const [show, setShow] = useState(false);

  return (
    <form action={action} onSubmit={v.onSubmit} noValidate className="space-y-5">
      <Suspense>
        <NextField />
      </Suspense>
      {state.error && <FormAlert>{state.error}</FormAlert>}
      <Field label="Email" name="email" required error={v.errors.email}>
        {(p) => <input {...p} onBlur={v.onBlur} onChange={v.onChange} type="email" defaultValue={state.email} autoComplete="username" autoFocus placeholder="you@example.com" />}
      </Field>
      <Field label="Password" name="password" required error={v.errors.password}>
        {(p) => (
          <div className="relative">
            <input {...p} onBlur={v.onBlur} onChange={v.onChange} type={show ? "text" : "password"} autoComplete="current-password" className={`${p.className} pr-11`} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-0 px-3.5 text-ink/40 hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        )}
      </Field>
      <button
        disabled={pending || !hydrated}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 font-semibold text-white shadow-sm transition hover:bg-ink/90 active:scale-[0.99] disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Sign in {!pending && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
