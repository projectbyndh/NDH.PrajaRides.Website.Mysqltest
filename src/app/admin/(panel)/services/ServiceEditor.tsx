"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, ExternalLink, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { control, Field, FormAlert, Modal } from "@/components/admin/form";
import { btn, Card } from "@/components/admin/ui";
import type { ServiceData } from "@/components/site/brand-services";
import type { ImageChoice } from "@/lib/content/store";
import { ICON_NAMES } from "@/lib/icons";
import { createServiceAction, deleteServiceAction, moveServiceAction, saveServiceAction, type ServiceFormState } from "./actions";
import { Select } from "@/components/Select";

const toLines = (items: { title: string; text: string }[]) => items.map((i) => (i.text ? `${i.title} | ${i.text}` : i.title)).join("\n");
const thumb = (slot: string) => `/media/site/${slot}?s=thumb`;

/** Adds a service: a name and web address; the rest is filled in with placeholders to edit. */
export function NewService() {
  const [state, action, pending] = useActionState<ServiceFormState, FormData>(createServiceAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <Card>
      <form action={action} className="space-y-4">
        <h2 className="text-base font-bold">Add a service</h2>
        {state.error && <FormAlert>{state.error}</FormAlert>}
        {state.saved && !state.error && <FormAlert tone="success">Added at the end of the list. Open it below to write its page.</FormAlert>}
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Name" name="name" required error={e.name}>
            {(p) => <input {...p} maxLength={40} placeholder="e.g. Airport Transfer" />}
          </Field>
          <Field label="Web address" name="slug" error={e.slug} hint="Optional. Made from the name if empty.">
            {(p) => <input {...p} maxLength={40} placeholder="airport-transfer" />}
          </Field>
          <button type="submit" disabled={pending} className={btn.primary}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add service
          </button>
        </div>
      </form>
    </Card>
  );
}

/** One service: a summary row (reorder, view, delete) that opens into the full editor. */
export function ServiceEditor({ service, images, first, last }: { service: ServiceData; images: ImageChoice[]; first: boolean; last: boolean }) {
  const [state, action, pending] = useActionState<ServiceFormState, FormData>(saveServiceAction.bind(null, service.slug), {});
  const [moving, startMove] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [open, setOpen] = useState(false);
  const [icon, setIcon] = useState(service.iconName);
  const [cover, setCover] = useState(service.image ?? "");
  const e = state.fieldErrors ?? {};
  return (
    <Card flush className={moving ? "opacity-60" : ""}>
      <div className="flex items-center gap-2 p-4 sm:p-5">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-4 text-left">
          <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-ink/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {service.image && <img src={thumb(service.image)} alt="" className="h-full w-full object-cover" />}
            <span className="absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-sm">
              <DynamicIcon name={service.iconName} className="h-3.5 w-3.5" />
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{service.name}</span>
            <span className="mt-0.5 line-clamp-1 block text-sm text-ink/55">{service.summary}</span>
          </span>
          <ChevronDown className={`h-5 w-5 shrink-0 text-ink/40 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        <span className="flex shrink-0 items-center gap-1">
          <button type="button" aria-label="Move up" disabled={first || moving} onClick={() => startMove(() => moveServiceAction(service.slug, -1))} className="rounded-lg p-2 text-ink/45 hover:bg-ink/5 hover:text-ink disabled:opacity-30">
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Move down" disabled={last || moving} onClick={() => startMove(() => moveServiceAction(service.slug, 1))} className="rounded-lg p-2 text-ink/45 hover:bg-ink/5 hover:text-ink disabled:opacity-30">
            <ArrowDown className="h-4 w-4" />
          </button>
          <a href={`/services/${service.slug}`} target="_blank" className="rounded-lg p-2 text-ink/45 hover:bg-ink/5 hover:text-ink" aria-label="View page">
            <ExternalLink className="h-4 w-4" />
          </a>
          <button type="button" onClick={() => setConfirm(true)} className="rounded-lg p-2 text-ink/45 hover:bg-pin/10 hover:text-pin" aria-label={`Delete ${service.name}`}>
            <Trash2 className="h-4 w-4" />
          </button>
        </span>
      </div>

      {(open || !!state.error) && (
        <form action={action} className="space-y-4 border-t border-ink/[0.08] p-4 sm:p-6">
          {state.error && <FormAlert>{state.error}</FormAlert>}
          {state.saved && !state.error && <FormAlert tone="success">Saved. The website shows the changes now.</FormAlert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" name="name" required error={e.name}>
              {(p) => <input {...p} defaultValue={service.name} maxLength={40} />}
            </Field>
            <Field label="Short label" name="tag" required error={e.tag} hint="Shown on photo chips, e.g. Rentals.">
              {(p) => <input {...p} defaultValue={service.tag} maxLength={24} />}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Icon {e.icon && <span className="text-xs font-medium text-pin">{e.icon}</span>}</span>
              <span className="flex items-center gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/30">
                  <DynamicIcon name={icon} className="h-5 w-5" />
                </span>
                <Select name="icon" className={control(!!e.icon)} value={icon} onChange={(ev) => setIcon(ev.target.value)}>
                  {ICON_NAMES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Cover photo {e.image && <span className="text-xs font-medium text-pin">{e.image}</span>}</span>
              <span className="flex items-center gap-2">
                <span className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-ink/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {cover && <img src={thumb(cover)} alt="" className="h-full w-full object-cover" />}
                </span>
                <Select name="image" className={control(!!e.image)} value={cover} onChange={(ev) => setCover(ev.target.value)}>
                  <option value="">No photo</option>
                  {images.map((i) => (
                    <option key={i.slot} value={i.slot}>
                      {i.label}
                    </option>
                  ))}
                </Select>
              </span>
            </label>
          </div>
          <Field label="Summary" name="summary" required error={e.summary} hint="One line for cards and menus.">
            {(p) => <textarea {...p} defaultValue={service.summary} rows={2} maxLength={200} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Page headline" name="headline" required error={e.headline}>
              {(p) => <input {...p} defaultValue={service.headline} maxLength={80} />}
            </Field>
            <Field label="WhatsApp message" name="whatsapp" error={e.whatsapp} hint="Pre-filled when visitors tap WhatsApp.">
              {(p) => <textarea {...p} defaultValue={service.whatsapp} rows={2} maxLength={400} />}
            </Field>
          </div>
          <Field label="Page intro" name="intro" required error={e.intro}>
            {(p) => <textarea {...p} defaultValue={service.intro} rows={3} maxLength={500} />}
          </Field>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="What you get" name="features" required error={e.features} hint='One per line: "Title | short text". Up to 6.'>
              {(p) => <textarea {...p} defaultValue={toLines(service.features)} rows={4} className={`${p.className} font-mono text-[13px]`} />}
            </Field>
            <Field label="How it works (steps)" name="steps" required error={e.steps} hint='One step per line: "Title | short text".'>
              {(p) => <textarea {...p} defaultValue={toLines(service.steps)} rows={4} className={`${p.className} font-mono text-[13px]`} />}
            </Field>
          </div>
          <Field label="Questions" name="faqs" error={e.faqs} hint='One per line: "Question | Answer". Up to 10.'>
            {(p) => <textarea {...p} defaultValue={service.faqs.map((f) => `${f.q} | ${f.a}`).join("\n")} rows={4} className={`${p.className} font-mono text-[13px]`} />}
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold">
              Page photos
              <span className="mt-0.5 block text-xs font-normal text-ink/55">Shown on the service page. Photos tagged with this service in Gallery are shown instead, when there are any.</span>
            </legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
              {images.map((i) => (
                <label key={i.slot} className="relative block cursor-pointer overflow-hidden rounded-lg ring-1 ring-ink/10 has-[:checked]:ring-2 has-[:checked]:ring-ink">
                  <input type="checkbox" name="gallery" value={i.slot} defaultChecked={service.gallery.includes(i.slot)} className="peer absolute right-1.5 top-1.5 z-10 h-4 w-4 accent-ink" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb(i.slot)} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover opacity-70 transition peer-checked:opacity-100" />
                  <span className="block truncate px-1.5 py-1 text-[11px] text-ink/60">{i.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-wrap items-center gap-x-2.5 text-sm font-semibold">
            <input type="checkbox" name="viaNepcab" defaultChecked={!!service.poweredBy} className="h-5 w-5 accent-ink" /> Booked in the NepCab app
            <span className="font-normal text-ink/55">(shows “Powered by NepCab” and the app download)</span>
          </label>
          <div className="flex justify-end">
            <button type="submit" disabled={pending} className={btn.primary}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : state.saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} Save {service.name}
            </button>
          </div>
        </form>
      )}

      <Modal open={confirm} onClose={() => setConfirm(false)} label="Delete service">
        <h2 className="text-lg font-bold">Delete “{service.name}”?</h2>
        <p className="mt-1 text-sm text-ink/60">It disappears from the menus, cards and service list, and /services/{service.slug} stops working. Its photos stay in Website images.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirm(false)} className={btn.secondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirm(false);
              startMove(() => deleteServiceAction(service.slug));
            }}
            className={`${btn.primary} bg-pin hover:bg-pin/90`}
          >
            Delete
          </button>
        </div>
      </Modal>
    </Card>
  );
}
