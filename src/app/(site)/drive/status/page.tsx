import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { Reveal } from "@/components/site/motion";
import { PageHero, Section } from "@/components/site/ui";
import { getBlock } from "@/lib/content/store";
import { getSiteContent } from "@/lib/site-content";
import { StatusForm } from "./StatusForm";
import { ButtonLink } from "@/components/site/Button";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getBlock("drive.status");
  return { title: c.seoTitle, description: c.seoDescription };
}

// Text comes from admin → Page content → Drive with us.
export default async function StatusPage() {
  const [{ contact }, c] = await Promise.all([getSiteContent(), getBlock("drive.status")]);
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} intro={c.intro} />
      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <StatusForm />
          <Reveal delay={120} className="space-y-6">
            <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-line sm:p-8">
              <p className="type-eyebrow text-accent-deep">{c.stagesLabel}</p>
              <ol className="mt-5 space-y-5">
                {c.stages.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/40 font-display font-bold text-accent-deep">{i + 1}</span>
                    <div>
                      <p className="font-display font-bold">{s.title}</p>
                      <p className="text-[15px] text-ink/65">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="bg-navy-grain rounded-3xl p-6 text-white sm:p-8">
              <p className="font-display font-bold">{c.ctaTitle}</p>
              <p className="mt-1 text-[15px] text-white/65">{c.ctaText}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ButtonLink href="/drive#apply" size="sm">{c.ctaLabel}</ButtonLink>
                <ButtonLink href={`tel:${contact.phone}`} variant="outline-dark" size="sm" icon={Phone}>{contact.phone}</ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
