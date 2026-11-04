import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Briefcase, Clock, HeartHandshake, MapPin } from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { ContactForm } from "../contact/ContactForm";
import { Reveal } from "@/components/site/motion";
import { PageHero, Section, SectionTitle } from "@/components/site/ui";
import { getBlock, getImageChoices, siteImage } from "@/lib/content/store";
import { getSiteContent } from "@/lib/site-content";
import { ButtonLink } from "@/components/site/Button";

export async function generateMetadata(): Promise<Metadata> {
  const hero = await getBlock("careers.hero");
  return { title: hero.seoTitle, description: hero.seoDescription };
}

export default async function CareersPage() {
  const [{ jobs, contact }, hero, why, apply, form, images] = await Promise.all([
    getSiteContent(),
    getBlock("careers.hero"),
    getBlock("careers.why"),
    getBlock("careers.apply"),
    getBlock("contact.form"),
    getImageChoices(),
  ]);
  const count = (title: string) => title.replace("{count}", String(jobs.length));
  return (
    <>
      <PageHero image={hero.image ? siteImage(hero.image, images) : undefined} eyebrow={hero.eyebrow} title={hero.titleLines} intro={hero.intro}>
        <div className="mt-8">
          <ButtonLink href="#apply" size="lg">{jobs.length ? hero.rolesButton : hero.applyButton}</ButtonLink>
        </div>
      </PageHero>

      <Section>
        <SectionTitle eyebrow={why.eyebrow} title={why.title} />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {why.items.map(({ icon, title, text }, i) => (
            <Reveal key={title + i} delay={i * 90} className="icon-card rounded-[1.75rem] bg-white p-6 ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-lg">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                <DynamicIcon name={icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-bold text-navy">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/65">{text}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section id="apply" className="scroll-mt-16 bg-white">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionTitle eyebrow={apply.eyebrow} title={jobs.length ? count(jobs.length === 1 ? apply.titleOne : apply.titleMany) : apply.titleNone} />
            {jobs.length ? (
              <ul className="mt-8 space-y-4">
                {jobs.map((j, i) => (
                  <Reveal as="li" key={j.title + i} delay={i * 80}>
                    <details className="surface-card group rounded-3xl p-6 open:border-accent/50 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex cursor-pointer list-none items-start gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                          <Briefcase className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-display text-lg font-bold text-navy">{j.title}</span>
                          <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink/65">
                            {j.type && (
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="h-4 w-4" /> {j.type}
                              </span>
                            )}
                            {j.location && (
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" /> {j.location}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="text-2xl leading-none text-accent transition group-open:rotate-45">+</span>
                      </summary>
                      <p className="mt-4 whitespace-pre-line text-[15.5px] leading-relaxed text-ink/70 sm:pl-15">{j.description}</p>
                    </details>
                  </Reveal>
                ))}
              </ul>
            ) : (
              <Reveal delay={100} className="mt-6 space-y-4 text-[16px] leading-relaxed text-ink/70">
                {apply.noneText.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </Reveal>
            )}
            <Reveal delay={150} className="mt-8 rounded-3xl bg-navy p-6 text-white">
              <p className="font-display font-bold">{apply.driveTitle}</p>
              <p className="mt-1 text-[15px] text-white/65">{apply.driveText}</p>
              <Link href="/drive" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-accent">
                {apply.driveLink} <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Reveal>
            {contact.email && (
              <p className="mt-6 flex items-start gap-2 text-sm text-ink/65">
                <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-accent-deep" />
                <span>
                  {apply.cvText}{" "}
                  <a href={`mailto:${contact.email}?subject=Job application`} className="font-semibold text-accent-deep transition hover:text-navy">
                    {contact.email}
                  </a>
                  .
                </span>
              </p>
            )}
          </div>
          <ContactForm topics={["careers"]} jobs={jobs.map((j) => j.title)} text={form} submitLabel={apply.submitLabel} />
        </div>
      </Section>
    </>
  );
}
