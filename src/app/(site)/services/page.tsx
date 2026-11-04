import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, Check, Phone } from "lucide-react";
import { WhatsAppGlyph } from "@/components/StoreBadges";
import { LogoMark } from "@/components/Logo";
import { AnimatedText } from "@/components/site/AnimatedText";
import { serviceCover, serviceHref, serviceWhatsAppUrl, withIcon, type ServiceWithIcon } from "@/components/site/brand-services";
import { getServices } from "@/lib/services";
import { ButtonLink } from "@/components/site/Button";
import { Reveal } from "@/components/site/motion";
import { Eyebrow } from "@/components/site/ui";
import { fillService } from "@/lib/content/pages/services";
import { getBlock } from "@/lib/content/store";
import { getSiteContent } from "@/lib/site-content";

export async function generateMetadata(): Promise<Metadata> {
  const [services, hero] = await Promise.all([getServices(), getBlock("services.hero")]);
  return {
    title: hero.seoTitle,
    description: fillService(hero.seoDescription, { services: services.map((s) => s.name.toLowerCase()).join(", ") }),
  };
}

// Services hub, top to bottom:
//   1. Centred hero: headline, call / WhatsApp, and a chip for every service (jumps to its row)
//   2. One editorial row per service, photo and text alternating sides
export default async function ServicesPage() {
  const [{ contact }, data, hero] = await Promise.all([getSiteContent(), getServices(), getBlock("services.hero")]);
  const services = data.map(withIcon);
  return (
    <>
      <section className="bg-hero-light relative isolate overflow-hidden border-b border-line px-4 pb-14 pt-12 text-center sm:px-6 sm:pb-20 sm:pt-24">
        <div className="bg-grid-ink pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-3xl">
          <div className="animate-fade-up flex justify-center">
            <Eyebrow>{hero.eyebrow}</Eyebrow>
          </div>
          <AnimatedText
            as="h1"
            immediate
            startDelay={150}
            lines={hero.titleLines}
            className="type-h1 mt-6 block text-navy"
          />
          <p className="type-lead animate-fade-up delay-200 mx-auto mt-6 max-w-2xl text-ink/70">
            {hero.intro}
          </p>
          <div className="animate-fade-up delay-300 mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href={`tel:${contact.phone}`} size="lg" icon={Phone}>
              {hero.callLabel}
            </ButtonLink>
            <ButtonLink href={`https://wa.me/977${contact.phone}`} variant="outline" size="lg" icon={WhatsAppGlyph}>
              {hero.whatsappLabel}
            </ButtonLink>
          </div>
        </div>

        {/* Jump to a service */}
        <nav aria-label={hero.jumpLabel} className="animate-fade-up delay-500 mx-auto mt-10 max-w-5xl sm:mt-14">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {services.map((s) => {
              const Icon = s.icon;
              return (
                <li key={s.slug}>
                  <a
                    href={`#${s.slug}`}
                    className="group flex h-full flex-col items-center gap-2.5 rounded-2xl bg-white px-3 py-4 ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] hover:ring-accent/60"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-navy">
                      <Icon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="font-display text-[15px] font-semibold leading-tight text-navy">{s.name}</span>
                    <ArrowDown className="h-4 w-4 text-ink/40 transition group-hover:translate-y-0.5 group-hover:text-accent" aria-hidden />
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </section>

      <div className="divide-y divide-line">
        {services.map((s, i) => (
          <ServiceRow key={s.slug} service={s} phone={contact.phone} flip={i % 2 === 1} labels={hero} />
        ))}
      </div>
    </>
  );
}

/** One service: a large photo on one side; name, intro, what you get and actions on the other. */
function ServiceRow({
  service: s,
  phone,
  flip,
  labels,
}: {
  service: ServiceWithIcon;
  phone: string;
  flip: boolean;
  labels: { exploreLabel: string; askLabel: string; poweredByLabel: string };
}) {
  const Icon = s.icon;
  const img = serviceCover(s);
  return (
    <section id={s.slug} aria-labelledby={`${s.slug}-title`} className="bg-white px-4 py-14 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-20">
        <Reveal from="zoom" className={`relative ${flip ? "lg:order-2" : ""}`}>
          <div className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-paper shadow-[var(--shadow-soft)] sm:aspect-[4/3] sm:rounded-[2rem] lg:aspect-[5/4]">
            {img && <Image src={img.src} alt={img.alt} fill sizes="(min-width: 1024px) 540px, 100vw" className="object-cover" />}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent" aria-hidden />
            <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/95 py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-navy shadow-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-navy">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              {s.tag}
            </span>
            {s.poweredBy && (
              <Link
                href={s.poweredBy.href}
                className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/95 py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-navy shadow-sm transition hover:bg-white"
              >
                <LogoMark className="h-7 w-7" /> {fillService(labels.poweredByLabel, { app: s.poweredBy.name })}
              </Link>
            )}
          </div>
        </Reveal>

        <div className={flip ? "lg:order-1" : ""}>
          <Reveal>
            <p className="type-eyebrow flex items-center gap-2 text-ink/65">
              {s.name}
            </p>
            <h2 id={`${s.slug}-title`} className="type-h2 mt-4 text-navy">
              {s.headline}
            </h2>
            <p className="mt-5 text-[16px] leading-relaxed text-ink/70">{s.intro}</p>
          </Reveal>

          <ul className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {s.features.map((f, j) => (
              <Reveal as="li" key={f.title} delay={100 + j * 70} className="flex gap-3 xl:flex-col xl:gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Check className="h-4 w-4" aria-hidden />
                </span>
                <span className="leading-snug">
                  <span className="block font-display text-[15px] font-semibold text-navy">{f.title}</span>
                  <span className="text-[14px] text-ink/65">{f.text}</span>
                </span>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={300} className="mt-10 flex flex-wrap items-center gap-3">
            <ButtonLink href={serviceHref(s)} variant="secondary" arrow="right">
              {fillService(labels.exploreLabel, { service: s.name })}
            </ButtonLink>
            <ButtonLink href={serviceWhatsAppUrl(phone, s)} variant="outline" icon={WhatsAppGlyph} target="_blank" rel="noopener noreferrer">
              {labels.askLabel}
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
