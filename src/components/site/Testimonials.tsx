import { Quote } from "lucide-react";
import type { Testimonial } from "@/lib/site-content";
import { Reveal } from "./motion";
import { SectionTitle } from "./ui";
import { Rail } from "./Rail";

/** Quotes from riders and driver partners (real ones only, added in the admin). */
export function Testimonials({ items }: { items: Testimonial[] }) {
  return (
    <section className="border-y border-line bg-white px-4 py-14 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionTitle eyebrow="In their words" title="What our *customers* say" />
        <Rail as="div" className="mt-8 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <Reveal key={i} delay={(i % 3) * 100}>
              <figure className="surface-card flex h-full flex-col rounded-[1.75rem] p-6 sm:p-8">
                <Quote className="h-7 w-7 text-accent" aria-hidden />
                <blockquote className="mt-6 flex-1 font-display text-[19px] leading-snug tracking-[-0.01em] text-navy">“{t.quote}”</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent font-display font-bold text-navy">
                    {t.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("")}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display font-bold text-navy">{t.name}</span>
                    <span className="block truncate text-sm text-ink/65">{[t.role, t.place].filter(Boolean).join(" · ")}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </Rail>
      </div>
    </section>
  );
}
