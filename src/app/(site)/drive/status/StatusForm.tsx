"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock3, Loader2, Search, XCircle } from "lucide-react";
import { Field } from "@/components/admin/form";
import { useHydrated } from "@/components/SubmitButton";
import { statusAction, type StatusState } from "./actions";
import { Button, ButtonLink } from "@/components/site/Button";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kathmandu" });

function Result({ result }: { result: NonNullable<StatusState["result"]> }) {
  if (!result.found) {
    return (
      <div className="surface-card rounded-2xl p-5">
        <p className="font-bold">We couldn&apos;t find an application</p>
        <p className="mt-1 text-[15px] text-ink/65">
          Check the mobile number and name you applied with, or{" "}
          <Link href="/drive#apply" className="font-semibold text-accent-deep transition hover:text-navy">
            apply now
          </Link>
          .
        </p>
      </div>
    );
  }
  const view = {
    driver: { icon: CheckCircle2, tone: "bg-emerald-50 ring-emerald-600/20 text-emerald-800", title: `Welcome aboard, ${result.name}!`, text: "You're a registered NepCab driver partner. Log in to the driver portal to see your QR code and rewards." },
    approved: { icon: CheckCircle2, tone: "bg-emerald-50 ring-emerald-600/20 text-emerald-800", title: `Approved, ${result.name}!`, text: "Your application is approved. Our office will share your driver portal login. Log in to complete your profile." },
    pending: { icon: Clock3, tone: "bg-mist ring-accent/30 text-navy", title: `Under review, ${result.name}`, text: "We've received your application. Our office will call you to check your documents." },
    rejected: { icon: XCircle, tone: "bg-pin/[0.05] ring-pin/20 text-pin", title: "Not approved this time", text: "Your application wasn't approved. Call or WhatsApp our office to find out why, or to apply again later." },
  }[result.status];
  const Icon = view.icon;
  return (
    <div className={`rounded-2xl p-5 ring-1 ${view.tone}`} role="status">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-6 w-6 shrink-0" />
        <div>
          <p className="font-display text-lg font-bold">{view.title}</p>
          <p className="mt-1 text-[15px] text-ink/70">{view.text}</p>
          {result.appliedOn && <p className="mt-3 text-sm text-ink/65">Applied on {day.format(new Date(result.appliedOn))}</p>}
          {result.status === "driver" && (
            <ButtonLink href="/driver/login" variant="secondary" size="sm" className="mt-4">Driver portal login</ButtonLink>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatusForm() {
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState<StatusState, FormData>(statusAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <div className="space-y-5">
      <form action={action} noValidate className="space-y-5 rounded-[1.75rem] bg-white p-6 ring-1 ring-line sm:p-8">
        <Field label="Mobile number" name="phone" required error={e.phone}>
          {(p) => <input {...p} defaultValue={state.values?.phone} inputMode="tel" autoComplete="tel" placeholder="98XXXXXXXX" />}
        </Field>
        <Field label="Your name" name="name" required error={e.name} hint="As written on your application.">
          {(p) => <input {...p} defaultValue={state.values?.name} autoComplete="name" />}
        </Field>
        <Button type="submit" size="lg" full disabled={pending || !hydrated} icon={pending ? Loader2 : Search} iconClassName={pending ? "animate-spin" : ""}>
            Check status
          </Button>
      </form>
      {state.result && <Result result={state.result} />}
    </div>
  );
}
