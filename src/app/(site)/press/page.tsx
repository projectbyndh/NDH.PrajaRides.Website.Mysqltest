import type { Metadata } from "next";
import Image from "next/image";
import { Download, Mail, Phone } from "lucide-react";
import { CopyButton } from "@/components/site/CopyButton";
import { FactSheet } from "@/components/site/showcase";
import { Reveal } from "@/components/site/motion";
import { PageHero, Section, SectionTitle } from "@/components/site/ui";
import { getBlock } from "@/lib/content/store";
import { getSiteContent } from "@/lib/site-content";
import { ButtonLink } from "@/components/site/Button";
import { LOGO } from "@/lib/site-images";

export async function generateMetadata(): Promise<Metadata> {
  const hero = await getBlock("press.hero");
  return { title: hero.seoTitle, description: hero.seoDescription };
}

// From admin → Website images → Brand (object storage); full size and the smaller copy.
const LOGO_FILES = [LOGO.src, `${LOGO.src}?s=thumb`];

/** White text on dark swatches, navy on light ones. */
function swatchText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "text-navy";
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.3 ? "text-white" : "text-navy";
}

export default async function PressPage() {
  const [{ contact, about }, hero, info, brand, press] = await Promise.all([
    getSiteContent(),
    getBlock("press.hero"),
    getBlock("press.about"),
    getBlock("press.brand"),
    getBlock("press.contact"),
  ]);
  const short = info.short;
  const facts = info.facts.slice();
  if (about.founded) facts.splice(3, 0, { label: info.foundedLabel, value: about.founded });
  const logos = [
    { file: LOGO_FILES[0], label: brand.logoLarge },
    { file: LOGO_FILES[1], label: brand.logoSmall },
  ];
  const long = about.story.join("\n\n");

  return (
    <>
      <PageHero eyebrow={hero.eyebrow} title={hero.title} intro={hero.intro} />

      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <SectionTitle eyebrow={info.eyebrow} title={info.title} intro={info.intro} />
            <Reveal delay={100} className="mt-8 space-y-4">
              <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-line">
                <div className="flex items-center gap-3">
                  <p className="type-eyebrow text-accent-deep">{info.shortLabel}</p>
                  <CopyButton text={short} className="ml-auto" />
                </div>
                <p className="mt-3 leading-relaxed text-ink/75">{short}</p>
              </div>
              <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-line">
                <div className="flex items-center gap-3">
                  <p className="type-eyebrow text-accent-deep">{info.longLabel}</p>
                  <CopyButton text={long} className="ml-auto" />
                </div>
                <div className="mt-3 space-y-3 leading-relaxed text-ink/75">
                  {about.story.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <FactSheet title={info.factsTitle} rows={facts} />
          </Reveal>
        </div>
      </Section>

      <Section className="bg-white">
        <SectionTitle eyebrow={brand.eyebrow} title={brand.title} />
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {logos.map((l, i) => (
              <Reveal key={l.file} delay={i * 100} className="overflow-hidden rounded-3xl ring-1 ring-line">
                <div className={`flex aspect-square items-center justify-center ${i === 0 ? "bg-navy" : "bg-mist"}`}>
                  <Image src={LOGO.src} alt={brand.logoAlt} width={160} height={160} className="h-32 w-32 rounded-full sm:h-36 sm:w-36" />
                </div>
                <a href={l.file} download={i === 0 ? "praja-ride-logo" : "praja-ride-logo-small"} className="flex items-center justify-between gap-2 bg-white px-5 py-4 text-sm font-semibold hover:bg-paper">
                  {l.label} <Download className="h-4 w-4 text-accent-deep" />
                </a>
              </Reveal>
            ))}
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {brand.colors.map((c, i) => (
                <Reveal key={c.hex + i} delay={i * 80}>
                  <div className={`flex h-28 flex-col justify-end rounded-3xl p-4 ring-1 ring-line ${swatchText(c.hex)}`} style={{ background: c.hex }}>
                    <span className="font-display font-bold">{c.name}</span>
                    <span className="font-mono text-xs opacity-75">{c.hex}</span>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={200} className="surface-card rounded-3xl p-6">
              <p className="type-eyebrow text-accent-deep">{brand.typeEyebrow}</p>
              <p className="mt-3 font-display text-2xl font-bold">{brand.typeName}</p>
              <p className="mt-1 text-lg text-ink/70">{brand.typeText}</p>
            </Reveal>
            <p className="text-sm leading-relaxed text-ink/65">{brand.note}</p>
          </div>
        </div>
      </Section>

      <Section>
        <Reveal className="flex flex-col gap-6 surface-card rounded-[2rem] p-8 text-navy sm:p-12 md:flex-row md:items-center">
          <div className="flex-1">
            <h2 className="type-h2 text-navy">{press.title}</h2>
            <p className="mt-2 text-ink/65">{press.text}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {contact.email && (
              <ButtonLink href={`mailto:${contact.email}?subject=${encodeURIComponent(press.emailSubject)}`} icon={Mail}>{contact.email}</ButtonLink>
            )}
            <ButtonLink href={`tel:${contact.phone}`} variant="outline" icon={Phone}>{contact.phone}</ButtonLink>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
