import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Car,
  Check,
  Clock,
  MapPin,
  Phone,
  PhoneCall,
  Target,
  Compass,
} from "lucide-react";
import { WhatsAppGlyph } from "@/components/StoreBadges";
import { LogoMark } from "@/components/Logo";
import { getIdentity } from "@/lib/identity";
import type { AboutContent, SiteContent } from "@/lib/site-content";
import { AnimatedText } from "../AnimatedText";
import { getBlock, getImageChoices, siteImage } from "@/lib/content/store";
import { DynamicIcon } from "@/components/DynamicIcon";
import { ButtonLink } from "../Button";
import { Reveal } from "../motion";
import { ServiceGrid } from "../ServiceGrid";
import { BookingTabs } from "./BookingTabs";
import { Eyebrow, Section, SectionTitle } from "../ui";
import { Rail } from "../Rail";

// Home page sections, in page order. Each one answers a single visitor question.

/* ---------- 01. Services: everything Praja Ride offers (bento) ---------- */

export async function Services() {
  const c = await getBlock("home.services");
  return (
    <Section>
      {/* Title left, "All services" top right (level with the title) */}
      <div className="flex flex-wrap items-start justify-between gap-6">
        <SectionTitle eyebrow={c.eyebrow} title={c.title} intro={c.intro} />
        <Reveal className="lg:mt-8">
          <ButtonLink href="/services" variant="outline" arrow="right">
            {c.buttonLabel}
          </ButtonLink>
        </Reveal>
      </div>
      <div className="mt-8 sm:mt-14">
        <ServiceGrid />
      </div>
    </Section>
  );
}

/* ---------- 02. Who it's for: customers, drivers, business ---------- */

export async function AudiencePaths() {
  const [c, images] = await Promise.all([getBlock("home.audiences"), getImageChoices()]);
  return (
    <Section className="border-t border-line bg-white">
      <SectionTitle eyebrow={c.eyebrow} title={c.title} />
      <Rail as="div" className="mt-8 grid gap-4 sm:mt-14 md:grid-cols-3">
        {c.cards.map(({ icon, who, title, text, points, href, cta, image: slot, featured }, i) => {
          const image = slot ? siteImage(slot, images) : null;
          return (
          <Reveal key={title} delay={i * 90}>
            <Link
              href={href}
              className={`group relative isolate flex h-full flex-col overflow-hidden rounded-[1.75rem] p-2 transition duration-300 hover:-translate-y-1 ${
                featured ? "bg-accent-gradient text-navy hover:shadow-[var(--shadow-lift)]" : "surface-card text-ink hover:border-accent/50 hover:shadow-[var(--shadow-lift)]"
              }`}
            >
              <div className="relative aspect-[16/8] overflow-hidden rounded-[1.35rem] bg-paper sm:aspect-[16/10]">
                {image && <Image src={image.src} alt={image.alt} fill sizes="(min-width: 768px) 360px, 100vw" className="object-cover transition duration-700 group-hover:scale-[1.04]" />}
                <span className={`absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${featured ? "bg-navy text-accent" : "bg-white text-accent"}`}>
                  <DynamicIcon name={icon} className="h-5 w-5" />
                </span>
                <span className="type-eyebrow absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1.5 !text-[11px] text-navy shadow-sm">{who}</span>
              </div>
              <div className="flex flex-1 flex-col px-5 pb-5 pt-6">
              <h3 className="type-h3 text-navy">{title}</h3>
              <p className={`mt-2 text-[15px] leading-relaxed ${featured ? "text-navy/80" : "text-ink/65"}`}>{text}</p>
              <ul className={`mt-5 space-y-2.5 border-t pt-5 text-[15px] sm:mt-6 sm:pt-6 ${featured ? "border-navy/15" : "border-line"}`}>
                {points.map((p) => (
                  <li key={p} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={3} aria-hidden />
                    <span className={featured ? "text-navy" : "text-ink/80"}>{p}</span>
                  </li>
                ))}
              </ul>
              <span className={`mt-auto flex items-center justify-between pt-6 font-semibold text-navy sm:pt-8`}>
                {cta}
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition duration-300 group-hover:rotate-45 ${
                    featured ? "bg-navy text-accent" : "bg-paper ring-1 ring-line group-hover:bg-accent group-hover:ring-accent"
                  }`}
                  aria-hidden
                >
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </span>
              </div>
            </Link>
          </Reveal>
          );
        })}
      </Rail>
    </Section>
  );
}

/* ---------- 03. Book your way: in the app, or offline by phone, WhatsApp or at the office ---------- */

export async function BookYourWay({ contact }: { contact: SiteContent["contact"] }) {
  const c = await getBlock("home.booking");
  return (
    <section id="book" className="relative isolate scroll-mt-20 border-y border-line bg-white px-4 py-14 sm:px-6 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow={c.eyebrow} title={c.title} intro={c.intro} />
        <BookingTabs content={c} hours={contact.hours} />
      </div>
    </section>
  );
}

/* ---------- 04. Why Praja Ride: trust ---------- */

export async function WhyUs({ contact }: { contact: SiteContent["contact"] }) {
  const [c, images] = await Promise.all([getBlock("home.whyus"), getImageChoices()]);
  const photo = c.image ? siteImage(c.image, images) : null;
  return (
    <Section>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
        {/* Left: title, then the support desk photo with the toll-free line */}
        <div className="flex flex-col">
          <SectionTitle eyebrow={c.eyebrow} title={c.title} intro={c.intro} />
          <Reveal from="zoom" delay={150} className="relative mt-8 min-h-[20rem] flex-1 overflow-hidden rounded-[1.75rem] bg-paper shadow-[var(--shadow-soft)]">
            {photo && <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 520px, 100vw" className="object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" aria-hidden />
            <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center gap-4 rounded-2xl bg-white/95 p-4 shadow-[var(--shadow-soft)] sm:inset-x-5 sm:bottom-5 sm:p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-navy">
                <PhoneCall className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1 leading-snug">
                <p className="type-eyebrow text-ink/65">{c.supportLabel}</p>
                <a href={`tel:${contact.tollFree}`} className="tabular block py-1.5 font-display text-xl font-bold text-navy transition hover:text-accent-deep">
                  {contact.tollFree}
                </a>
                <p className="text-[13.5px] text-ink/65">or call / WhatsApp {contact.phone}</p>
              </div>
              <ButtonLink href="/safety" variant="secondary" size="sm" arrow="right">
                Safety &amp; support
              </ButtonLink>
            </div>
          </Reveal>
        </div>

        {/* Right: four reasons as cards */}
        <Rail className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {c.reasons.map(({ icon, title, text }, i) => (
            <Reveal
              as="li"
              key={title}
              delay={i * 90}
              className="surface-card group flex flex-col rounded-[1.5rem] p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[var(--shadow-lift)] sm:p-7"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-navy">
                <DynamicIcon name={icon} className="h-6 w-6" />
              </span>
              <h3 className="type-h3 mt-6 text-navy">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink/65">{text}</p>
            </Reveal>
          ))}
        </Rail>
      </div>
    </Section>
  );
}

/* ---------- Driver recruitment ---------- */

export async function DriveCta() {
  const c = await getBlock("home.drive");
  return (
    <Section className="pt-0 sm:pt-0">
      <Reveal from="zoom">
        <div className="bg-accent-gradient grain relative isolate overflow-hidden rounded-[2rem] p-6 text-navy sm:p-14">
          <Car className="pointer-events-none absolute -bottom-16 -right-10 -z-10 h-[22rem] w-[22rem] text-navy/[0.07]" aria-hidden />
          <div className="relative grid items-end gap-8 sm:gap-12 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="type-eyebrow flex items-center gap-3 text-navy/70">
                {c.eyebrow}
              </p>
              <AnimatedText as="h2" lines={[c.title]} className="type-h2 mt-5 block text-navy" />
              <ul className="mt-7 grid gap-3 sm:mt-9 sm:grid-cols-2">
                {c.perks.map((p) => (
                  <li key={p} className="flex items-center gap-3 font-medium">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-accent">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-4 md:items-end">
              <ButtonLink href="/drive" variant="secondary" size="lg" arrow="right" full className="md:w-auto">
                {c.buttonLabel}
              </ButtonLink>
              <Link href="/driver" className="py-3 text-center text-sm font-semibold text-navy/75 transition hover:text-navy">
                {c.loginLabel}
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

/* ---------- About us: right under the hero (who Praja Ride is, in one glance) ---------- */

export async function WhoWeAre({ about }: { about: AboutContent }) {
  const [c, images, { city }] = await Promise.all([getBlock("home.about"), getImageChoices(), getIdentity()]);
  const main = c.image ? siteImage(c.image, images) : null;
  const inset = c.inset ? siteImage(c.inset, images) : null;
  return (
    <Section className="border-b border-line bg-white">
      <div className="grid items-center gap-10 sm:gap-16 lg:grid-cols-2 lg:gap-20">
        {/* Photo collage: city street, a driver inset, and a franchise badge */}
        <div className="relative mx-auto w-full max-w-[34rem] pb-8 pr-6 sm:pb-14 sm:pr-14 lg:mx-0">
          <Reveal from="zoom" className="relative aspect-[5/4] overflow-hidden sm:aspect-[4/5] rounded-[2rem] bg-paper shadow-[var(--shadow-soft)]">
            {main && <Image src={main.src} alt={main.alt} fill sizes="(min-width: 1024px) 480px, 90vw" className="object-cover" />}
          </Reveal>

          <Reveal
            delay={200}
            className="absolute bottom-0 right-0 aspect-square w-[46%] overflow-hidden rounded-[1.75rem] bg-paper shadow-[var(--shadow-lift)] ring-8 ring-white"
          >
            {inset && <Image src={inset.src} alt={inset.alt} fill sizes="240px" className="object-cover" />}
          </Reveal>

          <Reveal delay={300} className="bg-accent-gradient absolute -left-3 top-8 flex items-center gap-3 rounded-2xl py-3 pl-3 pr-5 text-navy shadow-[var(--shadow-lift)] sm:-left-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white">
              <LogoMark className="h-8 w-8" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg font-bold">{city}</span>
              <span className="text-[13px] font-semibold text-navy/75">NepCab franchise</span>
            </span>
          </Reveal>
        </div>

        {/* Story: title and line, mission and vision, then the actions */}
        <div>
          <SectionTitle eyebrow={c.eyebrow} title={c.title} />
          <Reveal delay={100}>
            <p className="type-lead mt-6 text-ink/70">{about.story[0]}</p>
          </Reveal>

          {/* Mission (amber) and vision (white), side by side */}
          {(about.mission || about.vision) && (
            <Rail as="div" className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                { icon: Target, label: "Our mission", text: about.mission, amber: true },
                { icon: Compass, label: "Our vision", text: about.vision, amber: false },
              ]
                .filter((v) => v.text)
                .map(({ icon: Icon, label, text, amber }, i) => (
                  <Reveal
                    key={label}
                    delay={160 + i * 90}
                    className={`group relative flex flex-col overflow-hidden rounded-[1.5rem] p-6 transition duration-300 hover:-translate-y-1 ${
                      amber ? "bg-accent-gradient text-navy shadow-[var(--shadow-soft)]" : "surface-card hover:shadow-[var(--shadow-lift)]"
                    }`}
                  >
                    <Icon className={`pointer-events-none absolute -right-5 -top-5 h-24 w-24 ${amber ? "text-navy/[0.07]" : "text-accent/10"}`} aria-hidden />
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${amber ? "bg-white/75 text-navy" : "bg-accent-soft text-accent"}`}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <p className={`type-eyebrow mt-5 ${amber ? "text-navy/70" : "text-ink/65"}`}>{label}</p>
                    <p className="mt-2 font-display text-[16.5px] font-bold leading-snug text-navy">{text}</p>
                  </Reveal>
                ))}
            </Rail>
          )}

          <Reveal delay={250} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <ButtonLink href="/about" variant="secondary" arrow="right">
              {c.buttonLabel}
            </ButtonLink>
            <Link href="/contact" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-navy transition hover:text-accent-deep">
              Visit our office <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

/* ---------- Help desk: contact card next to the FAQ ---------- */

export async function HelpDesk({ contact }: { contact: SiteContent["contact"] }) {
  const { city } = await getIdentity();
  const lines = [
    { href: `tel:${contact.phone}`, icon: Phone, label: "Call us", value: contact.phone },
    { href: `https://wa.me/977${contact.phone}`, icon: WhatsAppGlyph, label: "WhatsApp", value: contact.phone, external: true },
    { href: `tel:${contact.tollFree}`, icon: PhoneCall, label: "Toll free", value: contact.tollFree },
  ];
  return (
    <Reveal className="surface-card relative overflow-hidden rounded-[2rem] p-7 text-navy sm:p-9 lg:sticky lg:top-32">
      <Eyebrow>Need help?</Eyebrow>
      <h3 className="type-h3 mt-4 text-navy">Talk to our {city} team</h3>
      <ul className="mt-7 divide-y divide-line border-y border-line">
        {lines.map(({ href, icon: Icon, label, value, external }) => (
          <li key={label}>
            <a href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="group flex items-center gap-4 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-navy">
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="type-eyebrow block text-ink/65">{label}</span>
                <span className="tabular mt-1.5 block font-display text-lg font-semibold">{value}</span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-ink/40 transition group-hover:text-accent" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-6 flex items-start gap-2.5 text-sm text-ink/70">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden /> {contact.address}
      </p>
      {contact.hours && (
        <p className="mt-2 flex items-start gap-2.5 text-sm text-ink/70">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden /> {contact.hours}
        </p>
      )}
      <ButtonLink href="/contact" variant="secondary" arrow="right" className="mt-8">
        Contact page
      </ButtonLink>
    </Reveal>
  );
}
