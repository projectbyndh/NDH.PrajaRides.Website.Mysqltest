import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock3, Mail, MapPin, Navigation, Phone, PhoneCall } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { FacebookGlyph, InstagramGlyph, TikTokGlyph, WhatsAppGlyph } from "@/components/StoreBadges";
import { AnimatedText } from "@/components/site/AnimatedText";
import { ButtonLink } from "@/components/site/Button";
import { Reveal } from "@/components/site/motion";
import { Eyebrow, Section } from "@/components/site/ui";
import { getBlock } from "@/lib/content/store";
import { getServices } from "@/lib/services";
import { getSiteContent } from "@/lib/site-content";
import { ContactForm } from "./ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  const hero = await getBlock("contact.hero");
  return { title: hero.seoTitle, description: hero.seoDescription };
}

// Contact, top to bottom:
//   1. Hero: headline, then three quick ways to reach us (call, WhatsApp, toll free)
//   2. Message form beside the office card (map, address, hours, email, directions, socials)
//   3. Shortcuts for the most common reasons people get in touch

export default async function ContactPage() {
  const [{ contact, social, company }, services, hero, main, shortcuts, form] = await Promise.all([
    getSiteContent(),
    getServices(),
    getBlock("contact.hero"),
    getBlock("contact.main"),
    getBlock("contact.shortcuts"),
    getBlock("contact.form"),
  ]);
  const directions = social.google || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`;

  const quick = [
    { icon: Phone, label: hero.callLabel, value: contact.phone, note: hero.callNote, href: `tel:${contact.phone}` },
    { icon: WhatsAppGlyph, label: hero.whatsappLabel, value: contact.phone, note: hero.whatsappNote, href: `https://wa.me/977${contact.phone}`, external: true },
    { icon: PhoneCall, label: hero.tollFreeLabel, value: contact.tollFree, note: hero.tollFreeNote, href: `tel:${contact.tollFree}` },
  ];

  const socials = [
    { href: social.facebook, label: "Facebook", icon: FacebookGlyph },
    { href: social.tiktok, label: "TikTok", icon: TikTokGlyph },
    social.instagram && { href: social.instagram, label: "Instagram", icon: InstagramGlyph },
  ].filter(Boolean) as { href: string; label: string; icon: typeof FacebookGlyph }[];

  return (
    <>
      {/* 1. Hero + quick contact */}
      <section className="bg-hero-light relative isolate overflow-hidden border-b border-line px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-20">
        <div className="bg-grid-ink pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-6xl">
          <div className="grid items-end gap-8 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
            <div>
              <div className="animate-fade-up">
                <Eyebrow>{hero.eyebrow}</Eyebrow>
              </div>
              <AnimatedText as="h1" immediate startDelay={150} lines={hero.titleLines} className="type-h1 mt-6 block text-navy" />
            </div>
            <p className="type-lead animate-fade-up delay-200 border-l-2 border-accent pl-6 text-ink/70">
              {hero.intro}
            </p>
          </div>

          <ul className="animate-fade-up delay-300 mt-10 grid gap-3 sm:gap-4 lg:mt-12 lg:grid-cols-3">
            {quick.map(({ icon: Icon, label, value, note, href, external }) => (
              <li key={label}>
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="surface-card group flex h-full items-center gap-4 rounded-[1.5rem] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[var(--shadow-lift)]"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-navy">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="type-eyebrow block text-ink/65">{label}</span>
                    <span className="tabular mt-1.5 block font-display text-xl font-bold text-navy">{value}</span>
                    <span className="mt-0.5 block text-[13.5px] text-ink/65">{note}</span>
                  </span>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-ink/40 transition group-hover:text-accent" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2. Form + office */}
      <Section>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <Reveal className="surface-card rounded-[2rem] p-6 sm:p-9">
            <h2 className="type-h2 text-navy">{main.formTitle}</h2>
            <p className="mt-2 text-[15px] text-ink/65">{main.formIntro}</p>
            <ContactForm services={services.map((s) => s.name)} text={form} bare className="mt-8" />
          </Reveal>

          <Reveal delay={120} className="surface-card flex flex-col overflow-hidden rounded-[2rem] lg:self-start">
            <div className="relative h-64 bg-paper sm:h-72">
              <iframe
                title={`Map: ${contact.address}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(contact.address)}&output=embed`}
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <div className="p-6 sm:p-8">
              <p className="type-eyebrow text-ink/65">{main.officeEyebrow}</p>
              <h2 className="type-h3 mt-3 text-navy">{company.name}</h2>
              <ul className="mt-5 space-y-3.5 text-[15px] text-ink/75">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent" aria-hidden /> {contact.address}
                </li>
                {contact.hours && (
                  <li className="flex items-start gap-3">
                    <Clock3 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent" aria-hidden /> {contact.hours}
                  </li>
                )}
                {contact.email && (
                  <li className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-[18px] w-[18px] shrink-0 text-accent" aria-hidden />
                    <a href={`mailto:${contact.email}`} className="break-all font-medium text-navy transition hover:text-accent-deep">
                      {contact.email}
                    </a>
                  </li>
                )}
              </ul>
              <ButtonLink href={directions} variant="secondary" icon={Navigation} target="_blank" rel="noopener noreferrer" className="mt-7">
                {main.directionsLabel}
              </ButtonLink>

              {socials.length > 0 && (
                <div className="mt-8 border-t border-line pt-6">
                  <p className="type-eyebrow text-ink/65">{main.followLabel}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {socials.map(({ href, label, icon: Icon }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold text-navy ring-1 ring-line transition hover:bg-paper hover:ring-navy/30"
                      >
                        <Icon className="h-4 w-4" /> {label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </Section>

      {/* 3. Shortcuts */}
      <Section className="border-t border-line">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Reveal>
              <Eyebrow>{shortcuts.eyebrow}</Eyebrow>
            </Reveal>
            <AnimatedText as="h2" lines={[shortcuts.title]} className="type-h2 mt-5 block text-navy" />
          </div>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shortcuts.items.map(({ icon, title, text, href }, i) => (
            <Reveal as="li" key={href + i} delay={i * 70}>
              <Link href={href} className="group flex h-full items-center gap-4 rounded-[1.25rem] p-5 ring-1 ring-line transition hover:bg-paper hover:ring-accent/50">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-navy">
                  <DynamicIcon name={icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-semibold text-navy">{title}</span>
                  <span className="block text-[13.5px] text-ink/65">{text}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-ink/40 transition group-hover:text-accent" aria-hidden />
              </Link>
            </Reveal>
          ))}
        </ul>
      </Section>
    </>
  );
}
