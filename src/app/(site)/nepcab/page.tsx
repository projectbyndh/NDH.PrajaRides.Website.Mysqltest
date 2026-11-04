import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Clock, MapPin, PhoneCall, QrCode, Smartphone } from "lucide-react";
import { ShareQr } from "@/app/download/DesktopQr";
import { DynamicIcon } from "@/components/DynamicIcon";
import { LogoMark } from "@/components/Logo";
import { AnimatedText } from "@/components/site/AnimatedText";
import { Reveal } from "@/components/site/motion";
import { PlatformButtons } from "@/components/site/PlatformButtons";
import { PhoneMockup } from "@/components/site/showcase";
import { Faq, Section, SectionTitle } from "@/components/site/ui";
import { getBlock } from "@/lib/content/store";
import { getSiteContent } from "@/lib/site-content";
import { BookRideForm } from "./BookRideForm";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getBlock("nepcab.hero");
  return { title: c.seoTitle, description: c.seoDescription };
}

// Text comes from admin → Page content → NepCab app; contact details from admin → Website.
export default async function NepCabPage() {
  const [{ contact }, hero, book, services, booking, offline, sticker, faq, share] = await Promise.all([
    getSiteContent(),
    getBlock("nepcab.hero"),
    getBlock("nepcab.book"),
    getBlock("nepcab.services"),
    getBlock("nepcab.booking"),
    getBlock("nepcab.offline"),
    getBlock("nepcab.sticker"),
    getBlock("nepcab.faq"),
    getBlock("download.share"),
  ]);
  return (
    <>
      {/* Hero */}
      <section className="bg-hero-light relative isolate overflow-hidden border-b border-line px-4 pb-20 pt-16 text-navy sm:px-6 sm:pt-20">
        <div className="bg-grid-ink pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="animate-fade-up flex items-center gap-3 font-sans">
              <LogoMark className="h-16 w-16 drop-shadow" />
              <div>
                <p className="text-3xl font-extrabold leading-none">NEPCAB</p>
                <p className="font-deva text-lg font-bold text-ink/70">{hero.tagline}</p>
              </div>
            </div>
            <AnimatedText as="h1" immediate startDelay={150} lines={hero.titleLines} className="type-h1 mt-8 block text-navy" />
            <p className="type-lead animate-fade-up delay-200 mt-5 max-w-xl text-ink/70">
              {hero.intro}
            </p>
            <p className="animate-fade-up delay-300 mt-7 inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2 text-sm font-semibold text-accent ring-1 ring-accent/30">
              <MapPin className="h-4 w-4" /> {hero.areaBadge}
            </p>
            <div className="animate-fade-up delay-500 mt-8 max-w-sm">
              <PlatformButtons />
            </div>
            <a href="#offline" className="animate-fade-up delay-500 mt-5 inline-flex items-center gap-2 text-[15px] text-ink/70 transition hover:text-navy">
              <PhoneCall className="h-4 w-4 text-accent" aria-hidden /> {hero.offlinePrompt} <span className="font-semibold text-navy">{hero.offlineLabel}</span>
            </a>
          </div>
          {/* Book on the website: the request goes to the booking desk, which calls back to confirm */}
          <div id="book" className="animate-fade-in delay-200 scroll-mt-24">
            <div className="rounded-[2rem] bg-white p-5 shadow-[var(--shadow-lift)] ring-1 ring-line sm:p-8">
              <BookRideForm text={book} whatsapp={contact.phone} />
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <Section>
        <SectionTitle eyebrow={services.eyebrow} title={services.title} intro={services.intro} />
        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl bg-ink/10 ring-1 ring-ink/10 sm:grid-cols-2 lg:grid-cols-3">
          {services.items.map(({ icon, title: name, text }, i) => (
            <Reveal key={name} delay={(i % 3) * 100} className="icon-card group bg-white p-8 transition duration-300 hover:bg-paper">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent transition duration-300 group-hover:scale-110">
                <DynamicIcon name={icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-6 text-xl font-bold text-navy">{name}</h3>
              <p className="mt-2 text-[15.5px] leading-relaxed text-ink/65">{text}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* How to book in the app + QR */}
      <Section className="bg-white">
        <div className="grid items-center gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal className="hidden lg:block">
            <PhoneMockup />
          </Reveal>
          <div>
            <SectionTitle eyebrow={booking.eyebrow} title={booking.title} />
            <ol className="mt-10 space-y-7">
              {booking.steps.map(({ title, text }, i) => (
                <Reveal key={title} as="li" delay={i * 100} className="flex gap-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/40 font-display text-lg font-bold text-accent-deep">{i + 1}</span>
                  <div className="pt-1.5">
                    <p className="text-lg font-bold">{title}</p>
                    <p className="mt-0.5 text-[15.5px] text-ink/65">{text}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
            <Reveal delay={150} className="surface-card mt-10 rounded-3xl p-6 sm:p-8">
              <h3 className="text-xl font-bold text-navy">{booking.cardTitle}</h3>
              <p className="mt-1 text-[15px] text-ink/65">{booking.cardText}</p>
              <div className="mt-6 max-w-sm">
                <PlatformButtons />
              </div>
              <ShareQr path="/r" label={null} isDesktop={false} tone="praja" text={share} />
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Offline booking */}
      <Section tight id="offline" className="scroll-mt-20 border-t border-line">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionTitle
            eyebrow={offline.eyebrow}
            title={offline.title}
            intro={offline.intro}
          />
          {contact.hours && (
            <p className="inline-flex items-center gap-2 rounded-lg bg-paper px-3.5 py-2 text-sm font-medium text-navy ring-1 ring-line">
              <Clock className="h-4 w-4 text-accent" aria-hidden /> {contact.hours}
            </p>
          )}
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {offline.items.map(({ icon, title, text, cta, link: href }, i) => (
            <Reveal as="li" key={title} delay={i * 80}>
              <a
                href={href}
                {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="surface-card group flex h-full flex-col rounded-[1.5rem] p-6 transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-navy">
                  <DynamicIcon name={icon} className="h-6 w-6" />
                </span>
                <p className="mt-5 font-display text-lg font-semibold text-navy">{title}</p>
                <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-ink/65">{text}</p>
                <span className="tabular mt-5 inline-flex items-center gap-1.5 font-display text-[15px] font-semibold text-navy transition group-hover:text-accent-deep">
                  {cta} <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </span>
              </a>
            </Reveal>
          ))}
        </ul>
        <p className="mt-6 text-[14px] text-ink/65">
          {offline.note}{" "}
          <Link href={offline.noteHref} className="font-semibold text-navy transition hover:text-accent-deep">
            {offline.noteLink}
          </Link>
          .
        </p>
      </Section>

      {/* QR stickers + drivers */}
      <Section className="border-y border-line bg-white">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <SectionTitle eyebrow={sticker.eyebrow} title={sticker.title} intro={sticker.intro} />
          <Reveal delay={150} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="surface-card rounded-[1.75rem] p-6">
              <QrCode className="h-7 w-7 text-accent" />
              <p className="mt-4 font-display font-semibold text-navy">{sticker.ridersTitle}</p>
              <p className="mt-1 text-[15px] text-ink/65">{sticker.ridersText}</p>
            </div>
            <div className="surface-card rounded-[1.75rem] p-6">
              <Smartphone className="h-7 w-7 text-accent" />
              <p className="mt-4 font-display font-semibold text-navy">{sticker.driversTitle}</p>
              <p className="mt-1 text-[15px] text-ink/65">{sticker.driversText}</p>
              <Link href="/drive" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-accent">
                {sticker.driversLink} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* FAQ */}
      <Section>
        <div className="mx-auto max-w-3xl">
          <SectionTitle eyebrow={faq.eyebrow} title={faq.title} center />
          <div className="mt-10">
            <Faq items={faq.items} />
          </div>
        </div>
      </Section>
    </>
  );
}
