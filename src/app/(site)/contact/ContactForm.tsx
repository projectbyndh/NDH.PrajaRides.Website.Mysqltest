"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Field, FormAlert, useFormValidation } from "@/components/admin/form";
import { useHydrated } from "@/components/SubmitButton";
import { Button } from "@/components/site/Button";
import { CONTACT_FORM_TEXT, type ContactFormText } from "@/lib/content/pages/contact";
import { contactFieldError, CONTACT_TOPICS, type ContactTopic } from "@/lib/validation";
import { contactAction, type ContactState } from "./actions";
import { Select } from "@/components/Select";

type Extra = { label: string; placeholder?: string; options?: string[] };

/** The second, topic-specific question shown under the topic. */
function subjectFor(topic: string, jobs: string[], services: string[], t: ContactFormText): Extra | null {
  switch (topic) {
    case "service":
      return { label: t.serviceQuestion, options: services };
    case "business":
      return { label: t.businessQuestion, options: t.businessNeeds };
    case "careers":
      return { label: t.careersQuestion, options: [...jobs, t.generalApplication] };
    case "lost":
      return { label: t.lostQuestion, placeholder: t.lostPlaceholder };
    case "safety":
      return { label: t.safetyQuestion, placeholder: t.safetyPlaceholder };
    default:
      return null;
  }
}

const messageHint = (topic: string, t: ContactFormText): string | undefined =>
  ({ service: t.hintService, business: t.hintBusiness, careers: t.hintCareers, lost: t.hintLost, safety: t.hintSafety })[topic];

const topicLabel = (topic: ContactTopic, t: ContactFormText): string =>
  ({
    general: t.topicGeneral,
    service: t.topicService,
    rider: t.topicRider,
    driver: t.topicDriver,
    business: t.topicBusiness,
    careers: t.topicCareers,
    lost: t.topicLost,
    safety: t.topicSafety,
  })[topic];

export function ContactForm({
  topics = CONTACT_TOPICS.map((t) => t.value),
  jobs = [],
  services = [],
  text = CONTACT_FORM_TEXT,
  submitLabel = text.submitLabel,
  defaultSubject,
  className = "",
  bare = false,
}: {
  /** Topics to offer; with one topic the picker is hidden. */
  topics?: ContactTopic[];
  /** Open roles (careers form). */
  jobs?: string[];
  /** Service names (service enquiries). */
  services?: string[];
  /** Wording from admin → Page content → Contact (contact.form); the starting wording if not given. */
  text?: ContactFormText;
  submitLabel?: string;
  /** Pre-selected answer to the topic's second question (e.g. the service on a service page). */
  defaultSubject?: string;
  className?: string;
  /** Leave out the form's own card, when the page already places it inside one. */
  bare?: boolean;
}) {
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState<ContactState, FormData>(contactAction, {});
  const v = useFormValidation(contactFieldError, state.fieldErrors);
  const val = (k: string, f = "") => state.values?.[k] ?? f;
  const [topic, setTopic] = useState<string>(val("topic", topics[0]));
  const common = { onBlur: v.onBlur, onChange: v.onChange };
  const e = v.errors;
  const subject = subjectFor(topic, jobs, services, text);
  const card = bare ? "" : "surface-card rounded-[2rem] p-6 sm:p-8";

  if (state.done) {
    return (
      <div className={`text-center ${bare ? "py-6" : "surface-card rounded-[2rem] p-8"} ${className}`}>
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
        <h3 className="type-h3 mt-4 text-navy">{text.sentTitle}</h3>
        <p className="mt-2 text-ink/65">{text.sentText}</p>
      </div>
    );
  }

  return (
    <form action={action} onSubmit={v.onSubmit} noValidate className={`space-y-5 ${card} ${className}`}>
      {state.error && <FormAlert>{state.error}</FormAlert>}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {topics.length > 1 ? (
        <Field label={text.topicLabel} name="topic" required error={e.topic}>
          {(p) => (
            <Select
              {...p}
              {...common}
              value={topic}
              onChange={(ev) => {
                setTopic(ev.target.value);
                common.onChange(ev);
              }}
            >
              {CONTACT_TOPICS.filter((t) => topics.includes(t.value)).map((t) => (
                <option key={t.value} value={t.value}>
                  {topicLabel(t.value, text)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : (
        <input type="hidden" name="topic" value={topics[0]} />
      )}
      {topic === "business" && (
        <Field label={text.organizationLabel} name="organization" required error={e.organization}>
          {(p) => <input {...p} {...common} defaultValue={val("organization")} autoComplete="organization" placeholder={text.organizationPlaceholder} />}
        </Field>
      )}
      <Field label={topic === "business" ? text.contactPersonLabel : text.nameLabel} name="name" required error={e.name}>
        {(p) => <input {...p} {...common} defaultValue={val("name")} autoComplete="name" />}
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={text.phoneLabel} name="phone" error={e.phone} hint={text.phoneHint}>
          {(p) => <input {...p} {...common} defaultValue={val("phone")} inputMode="tel" autoComplete="tel" placeholder="98XXXXXXXX" />}
        </Field>
        <Field label={text.emailLabel} name="email" error={e.email}>
          {(p) => <input {...p} {...common} type="email" defaultValue={val("email")} autoComplete="email" />}
        </Field>
      </div>
      {subject && (
        <Field key={topic} label={subject.label} name="subject" error={e.subject}>
          {(p) =>
            subject.options ? (
              <Select {...p} {...common} defaultValue={val("subject", defaultSubject ?? subject.options[0])}>
                {subject.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            ) : (
              <input {...p} {...common} defaultValue={val("subject")} maxLength={120} placeholder={subject.placeholder} />
            )
          }
        </Field>
      )}
      <Field label={text.messageLabel} name="message" required error={e.message} hint={messageHint(topic, text)}>
        {(p) => <textarea {...p} {...common} rows={5} maxLength={1000} defaultValue={val("message")} placeholder={text.messagePlaceholder} />}
      </Field>
      <Button type="submit" size="lg" full disabled={pending || !hydrated} icon={pending ? Loader2 : Send} iconClassName={pending ? "animate-spin" : ""}>
          {submitLabel}
        </Button>
    </form>
  );
}
