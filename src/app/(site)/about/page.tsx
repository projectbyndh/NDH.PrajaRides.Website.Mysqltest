import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { LogoMark } from "@/components/Logo";
import { PrajaMark } from "@/components/PrajaLogo";
import { AnimatedText } from "@/components/site/AnimatedText";
import { serviceHref, withIcon } from "@/components/site/brand-services";
import { getServices } from "@/lib/services";
import { ButtonLink } from "@/components/site/Button";
import { PhotoMosaic } from "@/components/site/Gallery";
import { Reveal } from "@/components/site/motion";
import { Eyebrow, Section, SectionTitle } from "@/components/site/ui";
import { getBlock, getImageChoices, siteImage } from "@/lib/content/store";
import { pickFeatured } from "@/lib/media";
import { getGalleryPhotos } from "@/lib/photos";
import { getSiteContent } from "@/lib/site-content";

export async function generateMetadata(): Promise<Metadata> {
  const hero = await getBlock("about.hero");
  return { title: hero.seoTitle, description: hero.seoDescription };
}

// About, top to bottom:
//   1. Hero: headline, intro, a wide city photo with three key facts overlapping its foot
//   2. Our story (title left, story right) with the Praja Ride × NepCab partnership card
//   3. Mission and vision
//   4. What we do: the six services
//   5. Values
//   6. Journey (milestones, when set in admin)
//   7. Where we operate + company facts
//   8. Gallery and team (when there are any)

export default async function AboutPage() {
  const [{ contact, about }, photos, serviceData, images, hero, storyBlock, mission, what, values, areas, more] = await Promise.all([
    getSiteContent(),
    getGalleryPhotos(),
    getServices(),
    getImageChoices(),
    getBlock("about.hero"),
    getBlock("about.story"),
    getBlock("about.mission"),
    getBlock("about.services"),
    getBlock("about.values"),
    getBlock("about.areas"),
    getBlock("about.more"),
  ]);
  const services = serviceData.map(withIcon);
  const featured = pickFeatured(photos);
  const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const [lead, ...story] = about.story;

  const heroImage = hero.image ? siteImage(hero.image, images) : null;
  const storyImage = storyBlock.image ? siteImage(storyBlock.image, images) : null;
  const facts = hero.facts.map((f) => ({ ...f, value: f.value.replace("{services}", String(services.length)) }));

  // Founded, registration and PAN (Admin → Website) go after the first two rows
  const registered = [
    ...(about.founded ? [{ label: "Founded", value: about.founded }] : []),
    ...(about.registrationNo ? [{ label: "Registration no.", value: about.registrationNo }] : []),
    ...(about.panNo ? [{ label: "PAN / VAT", value: about.panNo }] : []),
  ];
  const companyRows = [...areas.rows.slice(0, 2), ...registered, ...areas.rows.slice(2)].filter((r) => r.label && r.value);

  return (
    <>
      {/* 1. Hero */}
      <section className="bg-hero-light relative isolate px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-20">
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

          <div className="animate-fade-in delay-300 relative mt-12">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[1.5rem] bg-paper sm:aspect-[21/9] sm:rounded-[2rem]">
              {heroImage && <Image src={heroImage.src} alt={heroImage.alt} fill preload sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />}
            </div>
            <dl className="relative z-10 mx-2 -mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-[1.25rem] bg-line shadow-[var(--shadow-lift)] ring-1 ring-line sm:mx-10 sm:-mt-14 sm:rounded-[1.5rem]">
              {facts.map((f, i) => (
                <div key={i} className="flex flex-col bg-white px-3 py-4 sm:px-6 sm:py-5">
                  <dt className="text-[12px] leading-snug text-ink/65 sm:text-[14px]">{f.label}</dt>
                  <dd className="order-first font-display text-xl font-extrabold tracking-tight text-navy sm:text-3xl">
                    {f.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* 2. Story */}
      <Section>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionTitle eyebrow={storyBlock.eyebrow} title={storyBlock.title} />
            <Reveal from="zoom" delay={120} className="relative mt-8 aspect-[16/10] overflow-hidden rounded-[1.75rem] bg-paper shadow-[var(--shadow-soft)] lg:aspect-[4/5]">
              {storyImage && <Image src={storyImage.src} alt={storyImage.alt} fill sizes="(min-width: 1024px) 400px, 100vw" className="object-cover" />}
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" aria-hidden />
              <span className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl bg-white/95 p-3 shadow-sm sm:right-auto">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-navy">
                  <MapPin className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="min-w-0 text-[13px] leading-tight">
                  <span className="block font-display font-semibold text-navy">{storyBlock.photoLabel}</span>
                  <span className="block truncate text-ink/65">{contact.address}</span>
                </span>
              </span>
            </Reveal>
          </div>
          <div>
            {lead && (
              <Reveal as="p" className="font-display text-xl font-semibold leading-snug text-navy sm:text-2xl">
                {lead}
              </Reveal>
            )}
            <div className="mt-6 space-y-4 text-[16px] leading-relaxed text-ink/70">
              {story.map((para, i) => (
                <Reveal as="p" key={i} delay={80 + i * 70}>
                  {para}
                </Reveal>
              ))}
            </div>

            <Reveal delay={200} className="surface-card mt-10 flex flex-col gap-5 rounded-[1.5rem] p-6 sm:flex-row sm:items-center">
              <div className="flex shrink-0 items-center gap-3">
                <PrajaMark className="h-14 w-14" />
                <span className="text-xl font-light text-ink/40" aria-hidden>
                  ×
                </span>
                <LogoMark className="h-14 w-14" />
              </div>
              <p className="text-[15px] leading-relaxed text-ink/70">
                <span className="block font-display font-semibold text-navy">{storyBlock.partnerTitle}</span>
                {storyBlock.partnerText}{" "}
                {storyBlock.partnerLinkLabel && storyBlock.partnerLink && (
                  <Link href={storyBlock.partnerLink} className="font-semibold text-navy transition hover:text-accent-deep">
                    {storyBlock.partnerLinkLabel}
                  </Link>
                )}
              </p>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* 3. Mission + vision */}
      <Section className="border-t border-line">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            { icon: mission.missionIcon, label: mission.missionLabel, text: about.mission, amber: true },
            { icon: mission.visionIcon, label: mission.visionLabel, text: about.vision, amber: false },
          ]
            .filter((v) => v.text)
            .map(({ icon, label, text, amber }, i) => (
              <Reveal
                key={label}
                delay={i * 120}
                className={`relative overflow-hidden rounded-[2rem] p-8 sm:p-10 ${amber ? "bg-accent-gradient text-navy" : "surface-card"}`}
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${amber ? "bg-white/70" : "bg-accent-soft text-accent"}`}>
                  <DynamicIcon name={icon} className="h-6 w-6" />
                </span>
                <p className={`type-eyebrow mt-6 ${amber ? "text-navy/75" : "text-ink/65"}`}>{label}</p>
                <p className="mt-3 font-display text-xl font-bold leading-snug text-navy sm:text-2xl">{text}</p>
              </Reveal>
            ))}
        </div>
      </Section>

      {/* 4. What we do */}
      <Section className="border-t border-line">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionTitle eyebrow={what.eyebrow} title={what.title} />
          <ButtonLink href="/services" variant="link" arrow="right">
            {what.buttonLabel}
          </ButtonLink>
        </div>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal as="li" key={s.slug} delay={(i % 3) * 70}>
                <Link href={serviceHref(s)} className="group flex h-full items-start gap-4 rounded-[1.25rem] p-5 ring-1 ring-line transition hover:bg-paper hover:ring-accent/50">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-navy">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 font-display font-semibold text-navy">
                      {s.name}
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink/40 transition group-hover:text-accent" aria-hidden />
                    </span>
                    <span className="mt-1 block text-[14px] leading-snug text-ink/65">{s.summary}</span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </Section>

      {/* 5. Values */}
      <Section className="border-t border-line">
        <SectionTitle eyebrow={values.eyebrow} title={values.title} />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.items.map(({ icon, title, text }, i) => (
            <Reveal as="li" key={i} delay={i * 90} className="icon-card surface-card rounded-[1.5rem] p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <DynamicIcon name={icon} className="h-5 w-5" />
              </span>
              <h3 className="type-h3 mt-5 text-navy">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink/65">{text}</p>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* 6. Journey */}
      {about.milestones.length > 0 && (
        <Section className="border-t border-line">
          <SectionTitle eyebrow={more.journeyEyebrow} title={more.journeyTitle} />
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {about.milestones.map((m, i) => (
              <Reveal as="li" key={i} delay={i * 90} className="rounded-[1.5rem] p-6 ring-1 ring-line">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-display font-bold text-navy">{i + 1}</span>
                  {m.date && <span className="type-eyebrow text-accent-deep">{m.date}</span>}
                </div>
                <h3 className="type-h3 mt-5 text-navy">{m.title}</h3>
                {m.text && <p className="mt-2 text-[15px] leading-relaxed text-ink/65">{m.text}</p>}
              </Reveal>
            ))}
          </ol>
        </Section>
      )}

      {/* 7. Where we operate + company facts */}
      <Section className="border-t border-line">
        <div className="grid items-start gap-8 lg:grid-cols-2">
          <Reveal>
            <SectionTitle eyebrow={areas.eyebrow} title={areas.title} />
            <p className="mt-5 text-[16px] leading-relaxed text-ink/70">{areas.text}</p>
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {areas.areas.map(({ city, note }, i) => (
                <li key={i} className="flex items-center gap-4 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="font-display text-lg font-semibold text-navy">{city}</span>
                  <span className="ml-auto text-[14px] text-ink/65">{note}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120} className="surface-card rounded-[2rem] p-6 sm:p-8">
            <p className="type-eyebrow text-ink/65">{areas.factsTitle}</p>
            <dl className="mt-4 divide-y divide-line">
              {companyRows.map((r, i) => (
                <div key={i} className="grid grid-cols-[8rem_1fr] gap-4 py-3.5 text-[15px]">
                  <dt className="text-ink/65">{r.label}</dt>
                  <dd className="break-words font-semibold text-navy">{r.value}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </Section>

      {/* 8. Gallery + team */}
      {featured.length > 0 && (
        <Section className="border-t border-line">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle eyebrow={more.galleryEyebrow} title={more.galleryTitle} />
            <ButtonLink href="/gallery" variant="link" arrow="right">
              {more.galleryButton}
            </ButtonLink>
          </div>
          <Reveal delay={100} className="mt-10">
            <PhotoMosaic photos={featured} />
          </Reveal>
        </Section>
      )}

      {about.team.length > 0 && (
        <Section className="border-t border-line">
          <SectionTitle eyebrow={more.teamEyebrow} title={more.teamTitle} />
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {about.team.map((t, i) => (
              <Reveal as="li" key={i} delay={(i % 4) * 90} className="surface-card rounded-[1.5rem] p-6 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft font-display text-xl font-bold text-accent-deep">{initials(t.name)}</span>
                <p className="mt-4 font-display font-bold text-navy">{t.name}</p>
                <p className="mt-0.5 text-sm text-ink/65">{t.role}</p>
              </Reveal>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
