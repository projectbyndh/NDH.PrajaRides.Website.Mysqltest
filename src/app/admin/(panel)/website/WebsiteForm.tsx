"use client";

import { useActionState, useState } from "react";
import { ArrowDown, ArrowUp, Check, ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { control, Field, FormAlert, FormSection } from "@/components/admin/form";
import { btn, Card, CardHeader } from "@/components/admin/ui";
import { useHydrated } from "@/components/SubmitButton";
import type { Faq, SiteContent } from "@/lib/site-content";
import { saveWebsiteAction, type WebsiteState } from "./actions";

type Col = { name: string; placeholder: string; multiline?: boolean; width?: string };

/** Add / remove / reorder rows of named inputs (posted as repeated form fields). */
function ListEditor<T extends Record<string, string>>({
  initial,
  cols,
  errors,
  prefix,
  listKey,
  max,
  addLabel,
  empty,
}: {
  initial: T[];
  cols: Col[];
  errors: Record<string, string>;
  prefix: string;
  listKey: string;
  max: number;
  addLabel: string;
  empty: T;
}) {
  const [rows, setRows] = useState(() => initial.map((r, i) => ({ ...r, key: i })));
  const move = (i: number, d: -1 | 1) =>
    setRows((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  return (
    <div>
      {errors[listKey] && <p className="mb-3 text-sm font-medium text-pin">{errors[listKey]}</p>}
      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.key} className={`rounded-xl border p-3 ${errors[`${prefix}${i}`] ? "border-pin/50 bg-pin/[0.03]" : "border-ink/10 bg-ink/[0.015]"}`}>
            <div className="flex items-start gap-2">
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
                {cols.map((c) =>
                  c.multiline ? (
                    <textarea key={c.name} name={c.name} defaultValue={r[c.name as keyof typeof r] as string} rows={2} placeholder={c.placeholder} aria-label={c.placeholder} className={`${control()} sm:col-span-full`} />
                  ) : (
                    <input key={c.name} name={c.name} defaultValue={r[c.name as keyof typeof r] as string} placeholder={c.placeholder} aria-label={c.placeholder} className={control()} />
                  ),
                )}
              </div>
              <div className="flex flex-col">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-ink/40 hover:bg-ink/5 disabled:opacity-30" aria-label="Move up">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="rounded-lg p-1.5 text-ink/40 hover:bg-ink/5 disabled:opacity-30" aria-label="Move down">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))} className="rounded-lg p-1.5 text-ink/40 hover:bg-pin/10 hover:text-pin" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {errors[`${prefix}${i}`] && <p className="mt-1.5 text-[13px] font-medium text-pin">{errors[`${prefix}${i}`]}</p>}
          </li>
        ))}
      </ol>
      {rows.length < max && (
        <button
          type="button"
          onClick={() => setRows((list) => [...list, { ...empty, key: Date.now() }])}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/15 p-3 text-sm font-semibold text-ink/55 hover:border-brand-dark hover:text-ink"
        >
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      )}
    </div>
  );
}

export function WebsiteForm({ content }: { content: SiteContent }) {
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState<WebsiteState, FormData>(saveWebsiteAction, {});
  const [faqs, setFaqs] = useState<(Faq & { key: number })[]>(() => content.faqs.map((f, i) => ({ ...f, key: i })));
  const [announce, setAnnounce] = useState(content.announcement.enabled);
  const e = state.fieldErrors ?? {};

  const move = (i: number, d: -1 | 1) =>
    setFaqs((list) => {
      const next = [...list];
      const j = i + d;
      if (j < 0 || j >= next.length) return list;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  // Inputs stay uncontrolled (defaultValue) except the FAQ list, so React's form reset after
  // submit doesn't wipe edits: the saved values are re-read from the server on the next render.
  return (
    <form action={action} noValidate className="space-y-6">
      {state.error && <FormAlert>{state.error}</FormAlert>}

      <Card>
        <CardHeader title="Announcement bar" description="A thin banner at the very top of every website page." className="mb-5" />
        <div className="space-y-4">
          <label className="flex items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" name="announcementEnabled" checked={announce} onChange={(ev) => setAnnounce(ev.target.checked)} className="h-4 w-4 accent-ink" />
            Show the announcement
          </label>
          <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
            <Field label="Text" name="announcementText" required={announce} error={e.announcementText}>
              {(p) => <input {...p} defaultValue={content.announcement.text} maxLength={160} placeholder="e.g. Rs 50 off your first NepCab ride in Butwal!" />}
            </Field>
            <Field label="Link" name="announcementLink" error={e.announcementLink} hint="Optional, e.g. /nepcab">
              {(p) => <input {...p} defaultValue={content.announcement.link} placeholder="/nepcab" />}
            </Field>
          </div>
        </div>
      </Card>

      {/* The home page headline moved to Page content → Home → Hero slideshow */}
      <input type="hidden" name="heroLine1" value={content.hero.line1} />
      <input type="hidden" name="heroLine2" value={content.hero.line2} />
      <input type="hidden" name="heroSubtitle" value={content.hero.subtitle} />

      <Card>
        <CardHeader
          title="Company"
          description="Used across the website text ({company}, {city}, {area} in Page content), the QR sticker, shared WhatsApp messages, the driver portal and Google's business listing."
          className="mb-5"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Company name" name="companyName" required error={e.companyName}>
            {(p) => <input {...p} defaultValue={content.company.name} maxLength={60} />}
          </Field>
          <Field label="City" name="city" required error={e.city}>
            {(p) => <input {...p} defaultValue={content.company.city} maxLength={40} />}
          </Field>
          <Field label="Service area" name="serviceArea" required error={e.serviceArea} hint="e.g. Butwal – Bhairahawa">
            {(p) => <input {...p} defaultValue={content.company.serviceArea} maxLength={80} />}
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Contact details" description="Used in the header, footer, contact page and home page." className="mb-5" />
        <FormSection title="Phone & email">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Call / WhatsApp" name="phone" required error={e.phone}>
              {(p) => <input {...p} defaultValue={content.contact.phone} inputMode="tel" />}
            </Field>
            <Field label="Toll free" name="tollFree" required error={e.tollFree}>
              {(p) => <input {...p} defaultValue={content.contact.tollFree} inputMode="numeric" />}
            </Field>
            <Field label="Email" name="email" error={e.email}>
              {(p) => <input {...p} defaultValue={content.contact.email} type="email" placeholder="info@…" />}
            </Field>
          </div>
        </FormSection>
        <div className="mt-6">
          <FormSection title="Office">
            <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
              <Field label="Address" name="address" required error={e.address}>
                {(p) => <input {...p} defaultValue={content.contact.address} maxLength={120} />}
              </Field>
              <Field label="Office hours" name="hours" error={e.hours}>
                {(p) => <input {...p} defaultValue={content.contact.hours} maxLength={80} placeholder="e.g. Sun–Fri, 9 AM – 6 PM" />}
              </Field>
            </div>
          </FormSection>
        </div>
        <div className="mt-6">
          <FormSection title="Social links">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Facebook" name="facebook" required error={e.facebook}>
                {(p) => <input {...p} defaultValue={content.social.facebook} placeholder="https://facebook.com/…" />}
              </Field>
              <Field label="TikTok" name="tiktok" required error={e.tiktok}>
                {(p) => <input {...p} defaultValue={content.social.tiktok} placeholder="https://tiktok.com/@…" />}
              </Field>
              <Field label="Instagram" name="instagram" error={e.instagram}>
                {(p) => <input {...p} defaultValue={content.social.instagram} placeholder="https://instagram.com/…" />}
              </Field>
              <Field label="Google Business Profile / Maps" name="google" error={e.google} hint="Helps people find you on Google.">
                {(p) => <input {...p} defaultValue={content.social.google} placeholder="https://maps.app.goo.gl/…" />}
              </Field>
            </div>
          </FormSection>
        </div>
      </Card>

      <Card>
        <CardHeader title="About Praja Ride" description="Shown on the About page (and the story on the home page). Empty fields are hidden." className="mb-5" />
        <div className="space-y-6">
          <Field label="Our story" name="aboutStory" required error={e.aboutStory} hint="Separate paragraphs with a blank line.">
            {(p) => <textarea {...p} defaultValue={content.about.story.join("\n\n")} rows={8} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mission" name="mission" required error={e.mission}>
              {(p) => <textarea {...p} defaultValue={content.about.mission} rows={3} maxLength={300} />}
            </Field>
            <Field label="Vision" name="vision" required error={e.vision}>
              {(p) => <textarea {...p} defaultValue={content.about.vision} rows={3} maxLength={300} />}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Founded (year)" name="founded" error={e.founded}>
              {(p) => <input {...p} defaultValue={content.about.founded} placeholder="e.g. 2025 or 2082 BS" />}
            </Field>
            <Field label="Company registration no." name="registrationNo" error={e.registrationNo}>
              {(p) => <input {...p} defaultValue={content.about.registrationNo} maxLength={40} />}
            </Field>
            <Field label="PAN / VAT no." name="panNo" error={e.panNo}>
              {(p) => <input {...p} defaultValue={content.about.panNo} maxLength={20} />}
            </Field>
          </div>
          <FormSection title="Our journey" description="Milestones shown as a timeline. The date is optional (e.g. “Baisakh 2082” or “2025”).">
            <ListEditor
              prefix="ms"
              listKey="milestones"
              initial={content.about.milestones.map((m) => ({ msDate: m.date, msTitle: m.title, msText: m.text }))}
              cols={[
                { name: "msDate", placeholder: "Date (optional)" },
                { name: "msTitle", placeholder: "Title" },
                { name: "msText", placeholder: "What happened", multiline: true },
              ]}
              errors={e}
              max={12}
              addLabel="Add a milestone"
              empty={{ msDate: "", msTitle: "", msText: "" }}
            />
          </FormSection>
          <FormSection title="Team" description="Leave empty to hide the team section.">
            <ListEditor
              prefix="team"
              listKey="team"
              initial={content.about.team.map((t) => ({ teamName: t.name, teamRole: t.role }))}
              cols={[
                { name: "teamName", placeholder: "Full name" },
                { name: "teamRole", placeholder: "Role, e.g. Managing Director" },
              ]}
              errors={e}
              max={16}
              addLabel="Add a person"
              empty={{ teamName: "", teamRole: "" }}
            />
          </FormSection>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Testimonials"
          description="Real quotes from riders and driver partners, with their permission. Shown on the home page; hidden while empty."
          className="mb-5"
        />
        <ListEditor
          prefix="t"
          listKey="testimonials"
          initial={content.testimonials.map((t) => ({ tQuote: t.quote, tName: t.name, tRole: t.role, tPlace: t.place }))}
          cols={[
            { name: "tName", placeholder: "Name" },
            { name: "tRole", placeholder: "Rider / Driver partner" },
            { name: "tPlace", placeholder: "Place, e.g. Butwal" },
            { name: "tQuote", placeholder: "What they said", multiline: true },
          ]}
          errors={e}
          max={12}
          addLabel="Add a testimonial"
          empty={{ tQuote: "", tName: "", tRole: "", tPlace: "" }}
        />
      </Card>

      <Card>
        <CardHeader title="Careers" description="Job openings on the Careers page. With none, the page invites people to send their CV." className="mb-5" />
        <ListEditor
          prefix="job"
          listKey="jobs"
          initial={content.jobs.map((j) => ({ jobTitle: j.title, jobType: j.type, jobLocation: j.location, jobText: j.description }))}
          cols={[
            { name: "jobTitle", placeholder: "Job title" },
            { name: "jobType", placeholder: "Full-time / Part-time" },
            { name: "jobLocation", placeholder: "Location, e.g. Butwal office" },
            { name: "jobText", placeholder: "What the job involves and who should apply", multiline: true },
          ]}
          errors={e}
          max={10}
          addLabel="Add an opening"
          empty={{ jobTitle: "", jobType: "", jobLocation: "", jobText: "" }}
        />
      </Card>

      <Card>
        <CardHeader title="Home page FAQs" description="Shown in the “Good to know” section. Up to 12." className="mb-5" />
        {e.faqs && <p className="mb-3 text-sm font-medium text-pin">{e.faqs}</p>}
        <ol className="space-y-3">
          {faqs.map((f, i) => (
            <li key={f.key} className={`rounded-xl border p-4 ${e[`faq${i}`] ? "border-pin/50 bg-pin/[0.03]" : "border-ink/10 bg-ink/[0.015]"}`}>
              <div className="flex items-start gap-3">
                <span className="mt-2 text-sm font-bold text-ink/35">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <input name="faqQ" defaultValue={f.q} maxLength={150} placeholder="Question" aria-label={`Question ${i + 1}`} className={`${control()} font-semibold`} />
                  <textarea name="faqA" defaultValue={f.a} rows={2} maxLength={600} placeholder="Answer" aria-label={`Answer ${i + 1}`} className={control()} />
                  {e[`faq${i}`] && <p className="text-[13px] font-medium text-pin">{e[`faq${i}`]}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-ink/40 hover:bg-ink/5 disabled:opacity-30" aria-label="Move up">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === faqs.length - 1} className="rounded-lg p-1.5 text-ink/40 hover:bg-ink/5 disabled:opacity-30" aria-label="Move down">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setFaqs((list) => list.filter((x) => x.key !== f.key))} className="rounded-lg p-1.5 text-ink/40 hover:bg-pin/10 hover:text-pin" aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
        {faqs.length < 12 && (
          <button type="button" onClick={() => setFaqs((list) => [...list, { q: "", a: "", key: Date.now() }])} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/15 p-3 text-sm font-semibold text-ink/55 hover:border-brand-dark hover:text-ink">
            <Plus className="h-4 w-4" /> Add a question
          </button>
        )}
      </Card>

      <div className="sticky bottom-20 z-20 flex flex-wrap items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-ink/10 backdrop-blur lg:bottom-4">
        <button disabled={pending || !hydrated} className={btn.primary}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save & publish
        </button>
        {state.saved && !pending && <span className="text-sm font-semibold text-emerald-700">Saved. The website is updated.</span>}
        <a href="/" target="_blank" className={`${btn.ghost} ml-auto`}>
          <ExternalLink className="h-4 w-4" /> View website
        </a>
      </div>
    </form>
  );
}
