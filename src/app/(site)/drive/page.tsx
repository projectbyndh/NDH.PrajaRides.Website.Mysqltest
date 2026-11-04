import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Gift, LogIn, Phone, QrCode } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { AnimatedText } from "@/components/site/AnimatedText";
import { ButtonLink } from "@/components/site/Button";
import { Reveal } from "@/components/site/motion";
import { Eyebrow, Faq, Section, SectionTitle } from "@/components/site/ui";
import { getBlock, getImageChoices, siteImage } from "@/lib/content/store";
import { getSiteContent } from "@/lib/site-content";
import { ApplyForm } from "./ApplyForm";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getBlock("drive.hero");
  return { title: c.seoTitle, description: c.seoDescription };
}

// "Drive with us", top to bottom:
//   1. Hero: headline, apply / status / login, three highlights; a photo with the personal-QR card
//   2. Why drive with us: referral rewards as the lead card, three smaller benefits
//   3. From application to first ride: four steps on a line (approval issues the personal link + QR)
//   4. Apply: intro, help and what to have ready, then the full-width form (with vehicle photos)
//   5. Questions

// Text and photos come from admin → Page content → Drive with us.
export default async function DrivePage() {
  const [hero, benefits, steps, apply, form, faq, images, { contact }] = await Promise.all([
    getBlock("drive.hero"),
    getBlock("drive.benefits"),
    getBlock("drive.steps"),
    getBlock("drive.apply"),
    getBlock("drive.form"),
    getBlock("drive.faq"),
    getImageChoices(),
    getSiteContent(),
  ]);
  const photo = hero.image ? siteImage(hero.image, images) : null;
  return (
    <>
      {/* 1. Hero */}
      <section className="bg-hero-light relative isolate overflow-hidden border-b border-line px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="bg-grid-ink pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <div className="animate-fade-up">
              <Eyebrow>{hero.eyebrow}</Eyebrow>
            </div>
            <AnimatedText as="h1" immediate startDelay={150} lines={hero.titleLines} className="type-h1 mt-6 block text-navy" />
            <p className="type-lead animate-fade-up delay-200 mt-6 max-w-xl text-ink/70">
              {hero.intro}
            </p>
            <div className="animate-fade-up delay-300 mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink href="#apply" size="lg" arrow="right">
                {hero.applyLabel}
              </ButtonLink>
              <ButtonLink href="/drive/status" variant="outline" size="lg">
                {hero.statusLabel}
              </ButtonLink>
            </div>
            <Link href="/driver" className="animate-fade-up delay-500 mt-6 inline-flex items-center gap-2 text-[15px] text-ink/70 transition hover:text-navy">
              <LogIn className="h-4 w-4 text-accent" aria-hidden /> {hero.loginPrompt} <span className="font-semibold text-navy">{hero.loginLabel}</span>
            </Link>
            <ul className="animate-fade-up delay-500 mt-8 grid max-w-xl grid-cols-3 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line">
              {hero.highlights.map(({ icon, text }) => (
                <li key={text} className="flex flex-col gap-2 bg-white p-4 text-[13.5px] font-medium leading-snug text-navy">
                  <DynamicIcon name={icon} className="h-5 w-5 text-accent" />
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-[32rem] pb-8 pr-6 sm:pr-8 lg:pl-6">
            <div className="hero-in-grow absolute bottom-0 right-0 h-2/5 w-2/5 rounded-[2rem] bg-accent [animation-delay:400ms]" aria-hidden />
            <div className="bg-dots hero-in-up absolute -left-2 top-6 h-28 w-28 [animation-delay:600ms]" aria-hidden />
            <div className="hero-in-wipe relative aspect-[4/3] overflow-hidden rounded-[1.75rem] rounded-tl-[5rem] bg-paper shadow-[var(--shadow-lift)] sm:aspect-[5/4] sm:rounded-[2rem] sm:rounded-tl-[7rem] lg:aspect-[4/5]">
              {photo && <Image src={photo.src} alt={photo.alt} fill preload sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />}
            </div>
            <div className="hero-in-up surface-card absolute -bottom-2 left-4 right-8 flex items-center gap-4 rounded-2xl p-4 [animation-delay:900ms] sm:left-auto sm:right-10 sm:w-80 lg:-left-2 lg:right-auto">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-navy">
                <QrCode className="h-6 w-6" aria-hidden />
              </span>
              <p className="text-sm leading-snug">
                <span className="block font-display font-semibold text-navy">{hero.qrTitle}</span>
                <span className="text-ink/65">{hero.qrText}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Benefits */}
      <Section tight>
        <SectionTitle eyebrow={benefits.eyebrow} title={benefits.title} />
        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Reveal className="bg-accent-gradient relative flex flex-col justify-between overflow-hidden rounded-[2rem] p-8 text-navy sm:p-10">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/70">
                <Gift className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="type-h2 mt-6 text-navy">{benefits.leadTitle}</h3>
              <p className="mt-3 max-w-md text-[16px] leading-relaxed text-navy/80">{benefits.leadText}</p>
            </div>
            <QrCode className="pointer-events-none absolute -bottom-8 -right-8 h-48 w-48 text-navy/10" aria-hidden />
          </Reveal>
          <ul className="grid gap-4">
            {benefits.items.map(({ icon, title, text }, i) => (
              <Reveal as="li" key={title} delay={100 + i * 80} className="surface-card flex items-start gap-5 rounded-[1.5rem] p-6">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <DynamicIcon name={icon} className="h-5 w-5" />
                </span>
                <span>
                  <span className="type-h3 block text-navy">{title}</span>
                  <span className="mt-1 block text-[15px] leading-relaxed text-ink/65">{text}</span>
                </span>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* 3. Steps */}
      <Section tight className="border-t border-line">
        <SectionTitle eyebrow={steps.eyebrow} title={steps.title} />
        <ol className="relative mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {/* Line joining the step numbers (desktop) */}
          <span className="absolute left-6 right-6 top-6 hidden h-px bg-gradient-to-r from-accent via-accent/50 to-line lg:block" aria-hidden />
          {steps.items.map(({ icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 100} className="relative flex flex-col">
              <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-accent font-display text-lg font-bold text-navy ring-8 ring-white">{i + 1}</span>
              <div className="surface-card mt-5 flex-1 rounded-[1.5rem] p-6">
                <DynamicIcon name={icon} className="h-5 w-5 text-accent" />
                <p className="type-h3 mt-4 text-navy">{title}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/65">{text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* 4. Apply: intro and help on top, then the form at full width */}
      <Section tight id="apply" className="scroll-mt-20 border-t border-line">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-14">
          <SectionTitle
            eyebrow={apply.eyebrow}
            title={apply.title}
            intro={apply.intro}
          />
          <Reveal className="surface-card rounded-[1.5rem] p-5 sm:p-6">
            <p className="font-display font-semibold text-navy">{apply.helpTitle}</p>
            <p className="mt-1 text-[15px] text-ink/65">{apply.helpText}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
              <ButtonLink href={`tel:${contact.phone}`} variant="secondary" size="sm" icon={Phone}>
                {contact.phone}
              </ButtonLink>
              <Link href="/drive/status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy transition hover:text-accent-deep">
                {apply.statusLink} <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>

        {/* What you need, as a row */}
        <Reveal className="mt-8">
          <p className="type-eyebrow text-ink/65">{apply.readyLabel}</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {apply.requirements.map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-xl bg-paper px-4 py-3 text-[14.5px] leading-snug text-navy ring-1 ring-line">
                <DynamicIcon name={icon} className="h-5 w-5 shrink-0 text-accent" />
                {text}
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="mt-8">
          <ApplyForm text={form} phone={contact.phone} />
        </div>
      </Section>

      {/* 5. Questions */}
      <Section tight className="border-t border-line">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <SectionTitle eyebrow={faq.eyebrow} title={faq.title} intro={faq.intro} />
          <Faq items={faq.items} />
        </div>
      </Section>
    </>
  );
}
