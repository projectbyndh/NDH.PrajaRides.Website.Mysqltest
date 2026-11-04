"use client";

import { useActionState, useState } from "react";
import { Bike, CalendarClock, Car, Check, CheckCircle2, Clock, Loader2, MapPinned, Plus, RotateCcw, Send, Sparkles, Users } from "lucide-react";
import { WhatsAppGlyph } from "@/components/StoreBadges";
import { Field, FormAlert, useFormValidation } from "@/components/admin/form";
import { useHydrated } from "@/components/SubmitButton";
import { Button } from "@/components/site/Button";
import type { BookRideText } from "@/lib/content/pages/nepcab";
import { BOOKING_MAX_DAYS, BOOKING_SURVEY, bookingFieldError, type BookingData, type SurveyKey } from "@/lib/validation";
import { bookRideAction, type BookState } from "./actions";

// "Book a ride" card at the top of /nepcab. The request goes to the booking desk (NepCab's
// dispatch belongs to head office), which calls the customer back to confirm.

const VEHICLES = [
  { value: "car", label: "Car", icon: Car },
  { value: "bike", label: "Bike", icon: Bike },
] as const;

/** "YYYY-MM-DDTHH:mm" in Nepal time, `minutes` from now: limits for the date-time picker. */
function nepalLocal(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000 + (5 * 60 + 45) * 60_000);
  return d.toISOString().slice(0, 16);
}

const rideTime = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kathmandu" });

const segment = (on: boolean) =>
  `flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
    on ? "bg-white text-navy shadow-sm ring-1 ring-line" : "text-ink/60 hover:text-navy"
  }`;

function whatsappText(b: BookingData): string {
  return [
    "Namaste! I'd like to book a NepCab ride.",
    `Pickup: ${b.pickup}`,
    `Drop-off: ${b.dropoff}`,
    `When: ${b.rideAt ? rideTime.format(new Date(b.rideAt)) : "As soon as possible"}`,
    `Vehicle: ${b.vehicleType === "bike" ? "Bike" : "Car"}`,
    `Name: ${b.name}`,
    `Mobile: ${b.phone}`,
    b.note ? `Note: ${b.note}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

const QUESTION_ICONS: Record<SurveyKey, typeof Users> = { sharePref: Users, availability: MapPinned };

/**
 * One optional question as checkbox tiles. One answer at most: ticking another moves the tick,
 * ticking the chosen one again clears it.
 */
function QuickQuestion({ name, initial }: { name: SurveyKey; initial: string }) {
  const [answer, setAnswer] = useState(initial);
  const q = BOOKING_SURVEY[name];
  const Icon = QUESTION_ICONS[name];
  return (
    <fieldset>
      <legend className="flex items-start gap-2.5 text-[14px] font-semibold leading-snug text-navy">
        <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-deep">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        {q.question}
      </legend>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {q.options.map((o) => {
          const on = answer === o.value;
          return (
            <label
              key={o.value}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-[13px] font-semibold leading-tight transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/25 sm:px-3 ${
                on ? "border-accent bg-accent-soft text-navy" : "border-line bg-white text-ink/70 hover:border-ink/25 hover:text-navy"
              }`}
            >
              <input type="checkbox" name={name} value={o.value} checked={on} onChange={() => setAnswer(on ? "" : o.value)} className="sr-only" />
              <span
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-2 transition ${
                  on ? "border-accent bg-accent text-navy" : "border-ink/25 bg-white"
                }`}
                aria-hidden
              >
                {on && <Check className="h-3 w-3" strokeWidth={3.5} />}
              </span>
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function BookRideForm({ text: t, whatsapp }: { text: BookRideText; whatsapp: string }) {
  const hydrated = useHydrated();
  const [round, setRound] = useState(0);
  return <BookRideInner key={round} t={t} whatsapp={whatsapp} hydrated={hydrated} onAnother={() => setRound((r) => r + 1)} />;
}

function BookRideInner({ t, whatsapp, hydrated, onAnother }: { t: BookRideText; whatsapp: string; hydrated: boolean; onAnother: () => void }) {
  const [state, action, pending] = useActionState<BookState, FormData>(bookRideAction, {});
  const val = (k: string, fallback = "") => state.values?.[k] ?? fallback;
  const [vehicle, setVehicle] = useState(val("vehicleType", "car"));
  const [when, setWhen] = useState(val("when", "now"));
  const [showNote, setShowNote] = useState(!!val("note"));
  const v = useFormValidation((field, value) => bookingFieldError(field, value, when), state.fieldErrors);
  const common = { onBlur: v.onBlur, onChange: v.onChange };
  const e = v.errors;

  if (state.done) {
    const b = state.done;
    return (
      <div className="text-center" role="status">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        <h2 className="mt-4 font-display text-2xl font-bold text-navy">{t.doneTitle}</h2>
        <p className="mx-auto mt-2 max-w-sm text-[15px] text-ink/65">
          {t.doneText} <span className="font-semibold text-ink">({b.phone})</span>
        </p>
        <dl className="mt-6 space-y-3 rounded-2xl bg-paper p-4 text-left text-sm ring-1 ring-line">
          <div className="flex gap-3">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            <div>
              <dt className="text-xs text-ink/50">Pickup</dt>
              <dd className="font-semibold text-navy">{b.pickup}</dd>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm bg-navy" aria-hidden />
            <div>
              <dt className="text-xs text-ink/50">Drop-off</dt>
              <dd className="font-semibold text-navy">{b.dropoff}</dd>
            </div>
          </div>
          <div className="flex gap-3 border-t border-line pt-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ink/40" aria-hidden />
            <dd className="font-medium text-ink/75">
              {b.rideAt ? rideTime.format(new Date(b.rideAt)) : "As soon as possible"} · {b.vehicleType === "bike" ? "Bike" : "Car"}
            </dd>
          </div>
        </dl>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <a
            href={`https://wa.me/977${whatsapp}?text=${encodeURIComponent(whatsappText(b))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25d366] px-4 text-[15px] font-semibold text-[#073b2a] transition hover:bg-[#20bd5a]"
          >
            <WhatsAppGlyph className="h-4 w-4" /> {t.whatsappLabel}
          </a>
          <Button variant="outline" onClick={onAnother} icon={RotateCcw}>
            Book another ride
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} onSubmit={v.onSubmit} noValidate className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-navy">{t.title}</h2>
        {t.badge && <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-deep ring-1 ring-accent/30">{t.badge}</span>}
      </div>
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {/* Spam trap: hidden from people, tempting to bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div className="flex gap-1 rounded-2xl bg-paper p-1 ring-1 ring-line" role="radiogroup" aria-label="Vehicle">
        {VEHICLES.map(({ value, label, icon: Icon }) => (
          <label key={value} className={segment(vehicle === value)}>
            <input type="radio" name="vehicleType" value={value} checked={vehicle === value} onChange={() => setVehicle(value)} className="sr-only" />
            <Icon className={`h-4 w-4 ${vehicle === value ? "text-accent" : ""}`} aria-hidden /> {label}
          </label>
        ))}
      </div>

      {/* Pickup and drop-off as one route, like ride apps */}
      <div>
        <div className={`relative rounded-2xl border bg-white shadow-sm transition focus-within:ring-4 focus-within:ring-accent/15 ${e.pickup || e.dropoff ? "border-pin/50" : "border-ink/15 focus-within:border-accent"}`}>
          <span className="pointer-events-none absolute bottom-[1.6rem] left-[1.36rem] top-[1.6rem] w-px border-l-2 border-dotted border-ink/20" aria-hidden />
          <label className="flex items-center gap-3 px-4">
            <span className="h-3 w-3 shrink-0 rounded-full border-[3px] border-emerald-500 bg-white" aria-hidden />
            <span className="sr-only">Pickup location</span>
            <input
              name="pickup"
              {...common}
              defaultValue={val("pickup")}
              maxLength={150}
              autoComplete="off"
              placeholder="Pickup location"
              aria-invalid={!!e.pickup}
              className="h-14 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink/40"
            />
          </label>
          <div className="ml-11 border-t border-line" />
          <label className="flex items-center gap-3 px-4">
            <span className="h-3 w-3 shrink-0 rounded-sm bg-navy" aria-hidden />
            <span className="sr-only">Drop-off location</span>
            <input
              name="dropoff"
              {...common}
              defaultValue={val("dropoff")}
              maxLength={150}
              autoComplete="off"
              placeholder="Where to?"
              aria-invalid={!!e.dropoff}
              className="h-14 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink/40"
            />
          </label>
        </div>
        {(e.pickup || e.dropoff) && <p className="mt-1.5 text-[13px] font-medium text-pin">{e.pickup ?? e.dropoff}</p>}
      </div>

      <div>
        <input type="hidden" name="when" value={when} />
        <div className="flex gap-1 rounded-2xl bg-paper p-1 ring-1 ring-line" role="radiogroup" aria-label="When">
          <button type="button" role="radio" aria-checked={when === "now"} onClick={() => setWhen("now")} className={segment(when === "now")}>
            <Clock className="h-4 w-4" aria-hidden /> Now
          </button>
          <button type="button" role="radio" aria-checked={when === "later"} onClick={() => setWhen("later")} className={segment(when === "later")}>
            <CalendarClock className="h-4 w-4" aria-hidden /> Schedule
          </button>
        </div>
        {when === "later" && (
          <Field label="Pickup date and time" name="rideAt" required error={e.rideAt} className="mt-3">
            {(p) => <input {...p} {...common} type="datetime-local" defaultValue={val("rideAt")} min={nepalLocal(10)} max={nepalLocal(BOOKING_MAX_DAYS * 1440)} />}
          </Field>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Your name" name="name" required error={e.name}>
          {(p) => <input {...p} {...common} defaultValue={val("name")} autoComplete="name" placeholder="Full name" />}
        </Field>
        <Field label="Mobile number" name="phone" required error={e.phone}>
          {(p) => <input {...p} {...common} defaultValue={val("phone")} inputMode="tel" autoComplete="tel" placeholder="98XXXXXXXX" />}
        </Field>
      </div>

      <section className="overflow-hidden rounded-2xl ring-1 ring-line" aria-labelledby="quick-questions">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-paper/80 px-4 py-2.5">
          <p id="quick-questions" className="flex items-center gap-1.5 text-[13px] font-semibold text-navy">
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden /> Help us improve rides near you
          </p>
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink/50 ring-1 ring-line">Optional</span>
        </div>
        <div className="space-y-5 bg-white p-4">
          <QuickQuestion name="sharePref" initial={val("sharePref")} />
          <div className="border-t border-dashed border-line" />
          <QuickQuestion name="availability" initial={val("availability")} />
        </div>
      </section>

      {showNote ? (
        <Field label="Note for the booking desk" name="note" error={e.note}>
          {(p) => <textarea {...p} {...common} rows={2} maxLength={300} defaultValue={val("note")} placeholder="e.g. Landmark, luggage, number of people" />}
        </Field>
      ) : (
        <button type="button" onClick={() => setShowNote(true)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-deep transition hover:text-navy">
          <Plus className="h-4 w-4" aria-hidden /> Add a note
        </button>
      )}

      <div>
        <Button type="submit" size="lg" full disabled={pending || !hydrated} icon={pending ? Loader2 : Send} iconClassName={pending ? "animate-spin" : ""}>
          {pending ? "Sending…" : t.submitLabel}
        </Button>
        <p className="mt-3 text-center text-[13px] leading-relaxed text-ink/55">{t.note}</p>
      </div>
    </form>
  );
}
