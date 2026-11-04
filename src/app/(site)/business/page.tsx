import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { WhatsAppGlyph } from "@/components/StoreBadges";
import { DynamicIcon } from "@/components/DynamicIcon";
import { ContactForm } from "../contact/ContactForm";
import { AnimatedText } from "@/components/site/AnimatedText";
import { serviceHref } from "@/components/site/brand-services";
import { getServices } from "@/lib/services";
import { ButtonLink } from "@/components/site/Button";
import { Reveal } from "@/components/site/motion";
import { Eyebrow, Section, SectionTitle } from "@/components/site/ui";
import { getBlock, getImageChoices, siteImage } from "@/lib/content/store";
import { getSiteContent } from "@/lib/site-content";

export async function generateMetadata(): Promise<Metadata> {
  const hero = await getBlock("business.hero");
  return { title: hero.seoTitle, description: hero.seoDescription };
}

// For business, top to bottom:
//   1. Hero: headline, enquire / call, who we work with; photo with a "one contact" card
//   2. Ways to work with us: six offers, each linked to the Praja Ride service behind it
//   3. Why Praja Ride (amber band)
//   4. Getting started: three numbered steps
//   5. Enquiry form beside the ways to reach us

export default async function BusinessPage() {
  const [{ contact }, serviceList, images, hero, offers, why, steps, enquire, formText] = await Promise.all([
    getSiteContent(),
    getServices(),
    getImageChoices(),
    getBlock("business.hero"),
    getBlock("business.offers"),
    getBlock("business.why"),
    getBlock("business.steps"),
    getBlock("business.enquire"),
    getBlock("contact.form"),
  ]);
  const heroImage = hero.image ? siteImage(hero.image, images) : null;
  const ways = [
    { icon: Phone, label: enquire.callLabel, value: contact.phone, href: `tel:${contact.phone}` },
    { icon: WhatsAppGlyph, label: enquire.whatsappLabel, value: contact.phone, href: `https://wa.me/977${contact.phone}`, external: true },
    { icon: MapPin, label: enquire.visitLabel, value: contact.address, href: "/contact" },
  ];

  return (
    <>
      {/* 1. Hero */}
      <section className="bg-hero-light relative isolate overflow-hidden border-b border-line px-4 pb-14 pt-10 sm:px-6 sm:pb-24 sm:pt-20">
        <div className="bg-grid-ink pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <div className="animate-fade-up">
              <Eyebrow>{hero.eyebrow}</Eyebrow>
            </div>
            <AnimatedText as="h1" immediate startDelay={150} lines={hero.titleLines} className="type-h1 mt-6 block text-navy" />
            <p className="type-lead animate-fade-up delay-200 mt-6 max-w-xl text-ink/70">
              {hero.intro}
            </p>
            <div className="animate-fade-up delay-300 mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink href="#enquire" size="lg" arrow="right">
                {hero.buttonLabel}
              </ButtonLink>
              <ButtonLink href={`tel:${contact.phone}`} variant="outline" size="lg" icon={Phone}>
                {contact.phone}
              </ButtonLink>
            </div>
            <div className="animate-fade-up delay-500 mt-10">
              <p className="type-eyebrow text-ink/65">{hero.audienceLabel}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {hero.audiences.map(({ icon, label }, i) => (
                  <li key={i} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-navy ring-1 ring-line">
                    <DynamicIcon name={icon} className="h-4 w-4 text-accent" /> {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="animate-fade-in delay-200 relative mx-auto w-full max-w-[32rem] pb-8 lg:pl-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-paper shadow-[var(--shadow-lift)] lg:aspect-[4/5]">
              {heroImage && <Image src={heroImage.src} alt={heroImage.alt} fill preload sizes="(min-width: 1024px) 480px, 100vw" className="object-cover" />}
            </div>
            <div className="surface-card absolute -bottom-2 left-4 right-4 flex items-center gap-4 rounded-2xl p-4 sm:left-auto sm:right-6 sm:w-80 lg:-left-2 lg:right-auto">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-navy">
                <DynamicIcon name={hero.cardIcon} className="h-6 w-6" />
              </span>
              <p className="text-sm leading-snug">
                <span className="block font-display font-semibold text-navy">{hero.cardTitle}</span>
                <span className="text-ink/65">{hero.cardText}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Offers */}
      <Section>
        <SectionTitle eyebrow={offers.eyebrow} title={offers.title} />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.items.map(({ icon, title, text, services }, i) => (
            <Reveal as="li" key={i} delay={(i % 3) * 90} className="surface-card flex flex-col rounded-[1.5rem] p-6 sm:p-7">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <DynamicIcon name={icon} className="h-5 w-5" />
                </span>
                <h3 className="type-h3 text-navy">{title}</h3>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-ink/65">{text}</p>
              {services.length > 0 && (
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-5">
                  {services.map((slug) => {
                    const s = serviceList.find((x) => x.slug === slug);
                    return s ? (
                      <Link key={slug} href={serviceHref(s)} className="rounded-md bg-accent-soft px-2.5 py-1 text-[12px] font-semibold text-accent-deep transition hover:bg-accent hover:text-navy">
                        {s.name}
                      </Link>
                    ) : null;
                  })}
                </div>
              )}
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* 3. Why Praja Ride */}
      <Section className="pt-0 sm:pt-0">
        <Reveal className="bg-accent-gradient rounded-[2rem] p-6 text-navy sm:p-12">
          <div className="grid gap-8">
            <div>
              <p className="type-eyebrow flex items-center gap-2 text-navy/75">
                {why.eyebrow}
              </p>
              <h2 className="type-h2 mt-4 text-navy">{why.title}</h2>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {why.items.map(({ icon, title, text }, i) => (
                <li key={i} className="flex gap-4 rounded-[1.25rem] bg-white/70 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-accent">
                    <DynamicIcon name={icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display font-bold">{title}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-navy/75">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Section>

      {/* 4. Steps */}
      <Section className="border-t border-line">
        <SectionTitle eyebrow={steps.eyebrow} title={steps.title} intro={steps.intro} />
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {steps.items.map((s, i) => (
            <Reveal as="li" key={i} delay={i * 100} className="flex gap-5 rounded-[1.5rem] p-6 ring-1 ring-line md:block">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-navy">{i + 1}</span>
              <span className="block md:mt-6">
                <span className="type-h3 block text-navy">{s.title}</span>
                <span className="mt-1.5 block text-[15px] text-ink/65">{s.text}</span>
              </span>
            </Reveal>
          ))}
        </ol>
      </Section>

      {/* 5. Enquiry */}
      <Section id="enquire" className="scroll-mt-20 border-t border-line">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          <div>
            <SectionTitle eyebrow={enquire.eyebrow} title={enquire.title} intro={enquire.intro} />
            <ul className="mt-8 space-y-3">
              {ways.map(({ icon: Icon, label, value, href, external }) => (
                <Reveal as="li" key={href}>
                  <a
                    href={href}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="group flex items-center gap-4 rounded-[1.25rem] p-4 ring-1 ring-line transition hover:bg-paper hover:ring-accent/50"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-navy">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="type-eyebrow block text-ink/65">{label}</span>
                      <span className="mt-1 block truncate font-display font-semibold text-navy">{value}</span>
                    </span>
                  </a>
                </Reveal>
              ))}
            </ul>
          </div>
          <Reveal delay={120} className="surface-card rounded-[2rem] p-6 sm:p-9">
            <h2 className="type-h3 text-navy">{enquire.formTitle}</h2>
            <p className="mt-2 text-[15px] text-ink/65">{enquire.formText}</p>
            <ContactForm topics={["business"]} text={formText} submitLabel={enquire.submitLabel} bare className="mt-8" />
          </Reveal>
        </div>
      </Section>
    </>
  );
}
