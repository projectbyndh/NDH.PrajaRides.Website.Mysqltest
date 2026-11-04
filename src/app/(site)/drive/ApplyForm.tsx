"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import { Camera, Car, CheckCircle2, IdCard, ImagePlus, Loader2, Send, X, type LucideIcon } from "lucide-react";
import { Field, FormAlert, FormSection, useFormValidation } from "@/components/admin/form";
import { useHydrated } from "@/components/SubmitButton";
import type { DriveFormText } from "@/lib/content/pages/drive";
import { resizeForApplication } from "@/lib/resize-image";
import { APPLICATION_PHOTOS, applicationFieldError } from "@/lib/validation";
import { applyAction, type ApplyState } from "./actions";
import { Button, ButtonLink } from "@/components/site/Button";

// "Drive with us" application, step 1: name, mobile, address, and photos of the vehicle and
// driving license, then a message and consent. Once the office approves it, the driver fills in
// the rest (documents, vehicle details, payouts) in the driver portal. Photos are resized in the
// browser and sent with the form in one request, so the application and its photos are saved together.

type Picked = { file: File; url: string };

/**
 * Photo picker with previews: tap to add (camera or gallery on phones) or drop files on it,
 * remove any photo. Empty, it's one large drop zone; with photos, a grid with an "add more" tile.
 */
function PhotoPicker({
  label,
  hint,
  max,
  icon: Icon,
  required = false,
  photos,
  onChange,
  error,
  name,
}: {
  label: string;
  hint: string;
  max: number;
  icon: LucideIcon;
  required?: boolean;
  photos: Picked[];
  onChange: (next: Picked[]) => void;
  error?: string;
  name: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const add = (files: FileList | null) => {
    if (!files) return;
    const fresh = Array.from(files)
      .filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name))
      .slice(0, max - photos.length)
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    if (fresh.length) onChange([...photos, ...fresh]);
  };
  const remove = (i: number) => {
    URL.revokeObjectURL(photos[i].url);
    onChange(photos.filter((_, j) => j !== i));
  };
  const msgId = `${name}-msg`;
  const single = max === 1;
  const full = photos.length >= max;
  const drop = full
    ? {}
    : {
        onDragOver: (e: DragEvent) => {
          e.preventDefault();
          setDragging(true);
        },
        onDragLeave: () => setDragging(false),
        onDrop: (e: DragEvent) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        },
      };
  const zone = error
    ? "border-pin/50 bg-pin/[0.04] text-pin"
    : dragging
      ? "border-accent bg-accent-soft text-navy"
      : "border-ink/15 bg-paper/60 text-ink/65 hover:border-accent hover:bg-accent-soft/60 hover:text-navy";
  const addButton = { type: "button" as const, onClick: () => input.current?.click(), "aria-describedby": msgId, "data-photo-field": name };

  return (
    <div {...drop}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="flex items-baseline gap-1 text-sm font-semibold text-ink">
          {label}
          {required ? <span className="text-pin" aria-hidden>*</span> : <span className="text-xs font-normal text-ink/65">Optional</span>}
        </p>
        {!single && photos.length > 0 && (
          <span className="rounded-full bg-ink/[0.05] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-ink/60">
            {photos.length}/{max}
          </span>
        )}
      </div>

      {photos.length === 0 ? (
        <button
          {...addButton}
          className={`group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${zone}`}
        >
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ring-1 transition group-hover:scale-105 ${
              error ? "bg-white text-pin ring-pin/20" : "bg-white text-accent-deep ring-line"
            }`}
          >
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <span>
            <span className="block font-display text-[15px] font-bold text-navy">{single ? "Add a photo" : "Add photos"}</span>
            <span className="mt-0.5 flex items-center justify-center gap-1.5 text-[13px] font-medium text-ink/55">
              <Camera className="h-3.5 w-3.5" aria-hidden /> Take a photo or choose from your gallery
            </span>
          </span>
          <span className="sr-only">: {label}</span>
        </button>
      ) : (
        <ul className={`grid gap-3 ${single ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
          {photos.map((p, i) => (
            <li key={p.url} className={`group relative overflow-hidden rounded-2xl bg-paper shadow-sm ring-1 ring-line ${single ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`${label} ${i + 1}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/45 to-transparent" aria-hidden />
              <span className="absolute bottom-2 left-2.5 flex items-center gap-1 text-xs font-semibold text-white">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {single ? "Added" : `Photo ${i + 1}`}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${label.toLowerCase()} photo ${i + 1}`}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-navy shadow-md transition hover:bg-pin hover:text-white"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
          {!full && (
            <li>
              <button
                {...addButton}
                className={`flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed text-[13px] font-semibold transition ${zone}`}
              >
                <ImagePlus className="h-6 w-6" aria-hidden />
                Add more
                <span className="sr-only">: {label}</span>
              </button>
            </li>
          )}
        </ul>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={!single}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      {error ? (
        <p id={msgId} className="mt-2 text-[13px] font-medium text-pin">
          {error}
        </p>
      ) : (
        <p id={msgId} className="mt-2 text-[13px] leading-relaxed text-ink/60">
          {hint}
        </p>
      )}
    </div>
  );
}

/** `text`: section titles and messages from admin → Page content → Drive with us. */
export function ApplyForm({ text: t, phone }: { text: DriveFormText; phone: string }) {
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyAction, {});
  const v = useFormValidation(applicationFieldError, state.fieldErrors);
  const [vehicle, setVehicle] = useState<Picked[]>([]);
  const [license, setLicense] = useState<Picked[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const val = (k: string, fallback = "") => state.values?.[k] ?? fallback;
  const common = { onBlur: v.onBlur, onChange: v.onChange };
  const e = v.errors;
  const busy = pending || preparing;

  // Free the preview images when the form goes away
  const all = useRef<Picked[]>([]);
  useEffect(() => {
    all.current = [...vehicle, ...license];
  }, [vehicle, license]);
  useEffect(() => () => all.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  async function submit(ev: FormEvent<HTMLFormElement>) {
    const form = ev.currentTarget;
    v.onSubmit(ev);
    const invalid = ev.defaultPrevented;
    ev.preventDefault();
    const missingVehicle = vehicle.length < APPLICATION_PHOTOS.vehicleMin;
    const missingLicense = license.length < 1;
    setPhotoError(missingVehicle ? "Add at least one photo of your vehicle." : null);
    setLicenseError(missingLicense ? "Add a photo of your driving license." : null);
    if (invalid) return;
    if (missingVehicle || missingLicense) {
      form.querySelector<HTMLButtonElement>(`[data-photo-field="${missingLicense ? "licensePhoto" : "vehiclePhotos"}"]`)?.focus();
      return;
    }

    setPreparing(true);
    try {
      const fd = new FormData(form);
      const groups: [string, Picked[]][] = [
        ["vehicle", vehicle],
        ["license", license],
      ];
      for (const [kind, list] of groups) {
        for (const p of list) {
          const r = await resizeForApplication(p.file);
          fd.append("photoKind", kind);
          fd.append("photoFull", r.full, "full");
          fd.append("photoThumb", r.thumb, "thumb");
          fd.append("photoWidth", String(r.width));
          fd.append("photoHeight", String(r.height));
        }
      }
      startTransition(() => action(fd));
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "A photo couldn't be read. Try a different one.");
    } finally {
      setPreparing(false);
    }
  }

  if (state.done) {
    return (
      <div className="surface-card rounded-[2rem] p-8 text-center sm:p-12">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        <h3 className="type-h2 mt-5 text-navy">{t.doneTitle}</h3>
        <p className="mx-auto mt-2 max-w-md text-ink/65">{t.doneText}</p>
        <p className="mt-3 text-sm text-ink/65">
          {t.doneStatus}{" "}
          <Link href="/drive/status" className="font-semibold text-navy transition hover:text-accent-deep">
            {t.doneStatusLink}
          </Link>
          .
        </p>
        <p className="mt-5 text-sm text-ink/65">
          {t.doneQuestions} <a href={`tel:${phone}`} className="font-bold text-ink">{phone}</a>
        </p>
        <ButtonLink href="/" variant="secondary" className="mt-6">{t.doneHomeLabel}</ButtonLink>
      </div>
    );
  }

  return (
    <form action={action} onSubmit={submit} noValidate className="surface-card rounded-[2rem] p-5 sm:p-8 lg:p-10">
      {state.error && (
        <div className="mb-8">
          <FormAlert>{state.error}</FormAlert>
        </div>
      )}
      {/* Spam trap: hidden from people, tempting to bots. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
        <FormSection title={t.aboutTitle}>
          <Field label="Full name" name="name" required error={e.name}>
            {(p) => <input {...p} {...common} defaultValue={val("name")} autoComplete="name" placeholder="As on your citizenship" />}
          </Field>
          <Field label="Mobile number" name="phone" required error={e.phone} hint="We'll call you on this number.">
            {(p) => <input {...p} {...common} defaultValue={val("phone")} inputMode="tel" autoComplete="tel" placeholder="98XXXXXXXX" />}
          </Field>
          <Field label="Address" name="address" required error={e.address}>
            {(p) => <input {...p} {...common} defaultValue={val("address")} maxLength={200} autoComplete="street-address" placeholder="e.g. Golpark, Butwal-8, Rupandehi" />}
          </Field>
          <Field label="Anything else?" name="message" error={e.message}>
            {(p) => <textarea {...p} {...common} rows={4} maxLength={500} defaultValue={val("message")} placeholder="e.g. Best time to call, driving experience, questions" />}
          </Field>
        </FormSection>

        <FormSection title={t.photosTitle} description={t.photosText}>
          <div className="space-y-7 pt-1">
            <PhotoPicker
              name="licensePhoto"
              icon={IdCard}
              label={t.licensePhotoLabel}
              hint={t.licensePhotoHint}
              max={1}
              required
              photos={license}
              onChange={(next) => {
                setLicense(next);
                if (next.length) setLicenseError(null);
              }}
              error={licenseError ?? e.licensePhoto}
            />
            <PhotoPicker
              name="vehiclePhotos"
              icon={Car}
              label={t.vehiclePhotosLabel}
              hint={t.vehiclePhotosHint.replace("{max}", String(APPLICATION_PHOTOS.vehicleMax))}
              max={APPLICATION_PHOTOS.vehicleMax}
              required
              photos={vehicle}
              onChange={(next) => {
                setVehicle(next);
                if (next.length) setPhotoError(null);
              }}
              error={photoError ?? e.vehiclePhotos}
            />
          </div>
        </FormSection>
      </div>

      <div className="mt-8 grid items-center gap-5 border-t border-line pt-6 lg:grid-cols-2 lg:gap-12">
        <div>
          <label className="flex items-start gap-3 text-sm text-ink/70">
            <input type="checkbox" name="consent" onChange={common.onChange} className="mt-0.5 h-5 w-5 shrink-0 accent-navy" />
            <span>
              {t.consent}{" "}
              <Link href="/privacy" className="font-semibold text-accent-deep transition hover:text-navy">{t.consentLink}</Link>.
            </span>
          </label>
          {e.consent && <p className="mt-1.5 text-[13px] font-medium text-pin">{e.consent}</p>}
        </div>
        <Button type="submit" size="lg" full disabled={busy || !hydrated} icon={busy ? Loader2 : Send} iconClassName={busy ? "animate-spin" : ""}>
          {preparing ? "Preparing photos…" : pending ? "Sending…" : t.submitLabel}
        </Button>
      </div>
    </form>
  );
}
