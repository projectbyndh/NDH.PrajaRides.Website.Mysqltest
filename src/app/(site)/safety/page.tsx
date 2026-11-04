import type { Metadata } from "next";
import { Phone, PhoneCall, Search } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { ContactForm } from "../contact/ContactForm";
import { Reveal } from "@/components/site/motion";
import { Faq, PageHero, Section, SectionTitle } from "@/components/site/ui";
import { getBlock, getImageChoices, siteImage } from "@/lib/content/store";
import { getSiteContent } from "@/lib/site-content";
import { ButtonLink } from "@/components/site/Button";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getBlock("safety.hero");
  return { title: c.seoTitle, description: c.seoDescription };
}

// Text comes from admin → Page content → Safety; phone numbers from admin → Website.
export default async function SafetyPage() {
  const [{ contact }, hero, emergency, checks, tips, lost, report, faq, images, formText] = await Promise.all([
    getSiteContent(),
    getBlock("safety.hero"),
    getBlock("safety.emergency"),
    getBlock("safety.checks"),
    getBlock("safety.tips"),
    getBlock("safety.lost"),
    getBlock("safety.report"),
    getBlock("safety.faq"),
    getImageChoices(),
    getBlock("contact.form"),
  ]);
  return (
    <>
      <PageHero image={hero.image ? siteImage(hero.image, images) : undefined} eyebrow={hero.eyebrow} title={hero.titleLines} intro={hero.intro}>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="#report" size="lg">{hero.reportLabel}</ButtonLink>
          <ButtonLink href={`tel:${contact.phone}`} variant="outline" size="lg" icon={Phone}>{contact.phone}</ButtonLink>
        </div>
      </PageHero>

      {/* Emergency */}
      <section className="relative z-10 -mt-8 px-4 sm:px-6">
        <Reveal className="mx-auto max-w-6xl rounded-[1.75rem] bg-white p-5 shadow-xl shadow-navy/5 ring-1 ring-line sm:p-6">
          <p className="type-eyebrow text-pin">{emergency.label}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {emergency.numbers.map(({ icon, label, number }) => (
              <a key={number} href={`tel:${number}`} className="group flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-line transition hover:ring-pin/30 sm:p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pin/[0.08] text-pin">
                  <DynamicIcon name={icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-2xl font-bold leading-none text-navy">{number}</span>
                  <span className="mt-1 block truncate text-xs text-ink/65">{label}</span>
                </span>
              </a>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink/65">
            {emergency.after} <a href={`tel:${contact.phone}`} className="font-semibold text-accent-deep transition hover:text-navy">{contact.phone}</a> or toll free{" "}
            <a href={`tel:${contact.tollFree}`} className="font-semibold text-accent-deep transition hover:text-navy">{contact.tollFree}</a>.
          </p>
        </Reveal>
      </section>

      <Section>
        <SectionTitle eyebrow={checks.eyebrow} title={checks.title} intro={checks.intro} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {checks.items.map(({ icon, title, text }, i) => (
            <Reveal key={title} delay={i * 90} className="icon-card rounded-[1.75rem] bg-white p-6 ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-lg">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <DynamicIcon name={icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-bold text-navy">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/65">{text}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section className="border-y border-line bg-white">
        <SectionTitle eyebrow={tips.eyebrow} title={tips.title} />
        <div className="mt-10 grid gap-px overflow-hidden rounded-[1.75rem] bg-line ring-1 ring-line sm:grid-cols-2">
          {tips.items.map(({ icon, title, text }, i) => (
            <Reveal key={title} delay={(i % 2) * 100} className="icon-card bg-white p-7 sm:p-8">
              <DynamicIcon name={icon} className="h-6 w-6 text-accent" />
              <h3 className="type-h3 mt-4 text-navy">{title}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-ink/65">{text}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <SectionTitle eyebrow={lost.eyebrow} title={lost.title} />
            <Reveal delay={100} className="mt-6 space-y-4 text-[16px] leading-relaxed text-ink/70">
              {lost.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </Reveal>
            <Reveal delay={150} className="mt-6 flex items-center gap-3 rounded-2xl bg-mist p-4 ring-1 ring-accent/25">
              <Search className="h-5 w-5 shrink-0 text-accent-deep" />
              <p className="text-[15px] text-navy">{lost.formNote}</p>
            </Reveal>
          </div>
          <div>
            <SectionTitle eyebrow={lost.afterEyebrow} title={lost.afterTitle} />
            <ol className="mt-8 space-y-6">
              {lost.afterSteps.map((s, i) => (
                <Reveal as="li" key={s.title} delay={i * 100} className="flex gap-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/40 font-display text-lg font-bold text-accent-deep">{i + 1}</span>
                  <div className="pt-1.5">
                    <p className="text-lg font-bold">{s.title}</p>
                    <p className="text-[15px] text-ink/65">{s.text}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </Section>

      <Section id="report" className="scroll-mt-16 bg-white">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionTitle eyebrow={report.eyebrow} title={report.title} intro={report.intro} />
            <Reveal delay={150} className="mt-8 space-y-3">
              <a href={`tel:${contact.phone}`} className="flex items-center gap-3 rounded-2xl bg-navy p-4 text-white transition hover:bg-navy/90">
                <Phone className="h-5 w-5 text-accent" />
                <span>
                  <span className="block text-xs text-white/55">{report.phoneLabel}</span>
                  <span className="font-display font-bold">{contact.phone}</span>
                </span>
              </a>
              <a href={`tel:${contact.tollFree}`} className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:ring-accent/40">
                <PhoneCall className="h-5 w-5 text-accent-deep" />
                <span>
                  <span className="block text-xs text-ink/65">{report.tollFreeLabel}</span>
                  <span className="font-display font-bold">{contact.tollFree}</span>
                </span>
              </a>
            </Reveal>
          </div>
          <ContactForm topics={["safety", "lost"]} text={formText} submitLabel={report.submitLabel} />
        </div>
      </Section>

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
