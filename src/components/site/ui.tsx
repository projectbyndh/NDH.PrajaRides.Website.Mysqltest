import type { ReactNode } from "react";
import Image from "next/image";
import type { SiteImage } from "@/lib/site-images";
import { Plus } from "lucide-react";
import { AnimatedText } from "./AnimatedText";
import { Reveal } from "./motion";

// Building blocks for the public Praja Ride pages. Type comes from the scale in globals.css
// (.type-display / h1 / h2 / h3 / lead / eyebrow). Headings are one colour: navy on light
// surfaces (white only on dark ones).

/** Page section. `tight` uses less vertical space, for pages with many short sections. */
export function Section({ children, className = "", id, tight = false }: { children: ReactNode; className?: string; id?: string; tight?: boolean }) {
  return (
    <section id={id} className={`px-4 sm:px-6 ${tight ? "py-10 sm:py-16 lg:py-[4.5rem]" : "py-12 sm:py-24 lg:py-28"} ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

/** Small bold uppercase label above a title, in the brand amber. */
export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <p className={`type-eyebrow ${dark ? "text-accent" : "text-accent-deep"}`}>{children}</p>;
}

export function SectionTitle({
  eyebrow,
  title,
  intro,
  center = false,
  dark = false,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  center?: boolean;
  dark?: boolean;
}) {
  return (
    <div className={`${center ? "mx-auto flex flex-col items-center text-center" : ""} max-w-2xl`}>
      {eyebrow && (
        <Reveal>
          <Eyebrow dark={dark}>
            {eyebrow}
          </Eyebrow>
        </Reveal>
      )}
      <AnimatedText as="h2" lines={[title]} className={`type-h2 mt-3 block sm:mt-4 ${dark ? "text-white" : "text-navy"}`} />
      {intro && (
        <Reveal delay={250}>
          <p className={`type-lead mt-4 ${dark ? "text-white/65" : "text-ink/65"}`}>{intro}</p>
        </Reveal>
      )}
    </div>
  );
}

/** Light page header shared by every inner page. `aside` (or a framed `image`) sits on the right. */
export function PageHero({
  eyebrow,
  title,
  intro,
  children,
  aside,
  image,
}: {
  eyebrow: string;
  title: string | string[];
  intro: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
  image?: SiteImage;
}) {
  if (!aside && image) {
    aside = (
      <div className="surface-card rounded-[2rem] p-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.6rem] bg-paper">
          <Image src={image.src} alt={image.alt} fill preload sizes="(min-width: 1024px) 440px, 100vw" className="object-cover" />
        </div>
      </div>
    );
  }
  return (
    <section className="bg-hero-light relative isolate overflow-hidden border-b border-line px-4 pb-14 pt-10 sm:px-6 sm:pb-24 sm:pt-24">
      <div className="bg-grid-ink pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className={`relative mx-auto max-w-6xl ${aside ? "grid items-end gap-12 lg:grid-cols-[1.25fr_0.75fr]" : ""}`}>
        <div>
          <div className="animate-fade-up">
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
          <AnimatedText
            as="h1"
            immediate
            startDelay={150}
            lines={Array.isArray(title) ? title : [title]}
            className="type-h1 mt-6 block max-w-4xl text-navy"
          />
          <p className="type-lead animate-fade-up delay-200 mt-6 max-w-2xl text-ink/70">{intro}</p>
          {children && <div className="animate-fade-up delay-300">{children}</div>}
        </div>
        {aside && <div className="animate-fade-in delay-300">{aside}</div>}
      </div>
    </section>
  );
}

export function Faq({ items }: { items: { q: string; a: ReactNode }[] }) {
  return (
    <Reveal className="border-t border-line">
      {items.map((it) => (
        <details key={it.q} className="group border-b border-line py-1 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-[17px] font-semibold text-navy transition hover:text-accent-deep">
            {it.q}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-navy transition duration-300 group-open:rotate-45 group-open:border-accent group-open:bg-accent">
              <Plus className="h-4 w-4" aria-hidden />
            </span>
          </summary>
          <div className="max-w-2xl pb-5 pr-12 text-[15.5px] leading-relaxed text-ink/70">{it.a}</div>
        </details>
      ))}
    </Reveal>
  );
}
