import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { ButtonLink } from "@/components/site/Button";
import { Eyebrow } from "@/components/site/ui";
import { getBlock } from "@/lib/content/store";
import { getSiteContent } from "@/lib/site-content";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

// Shown inside the site layout when a page, service or post doesn't exist (text in admin → Page content → Every page).
export default async function NotFound() {
  const [c, { contact }] = await Promise.all([getBlock("site.notFound"), getSiteContent()]);
  return (
    <section className="bg-hero-light relative isolate overflow-hidden px-4 py-20 text-center sm:px-6 sm:py-32">
      <div className="bg-grid-ink pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-center">
          <Eyebrow>{c.eyebrow}</Eyebrow>
        </div>
        <h1 className="type-h1 mt-6 text-navy">{c.title}</h1>
        <p className="type-lead mx-auto mt-5 max-w-xl text-ink/70">{c.text}</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" size="lg">
            {c.homeButton}
          </ButtonLink>
          <ButtonLink href="/services" variant="outline" size="lg">
            {c.servicesButton}
          </ButtonLink>
          <ButtonLink href={`tel:${contact.phone}`} variant="link" icon={Phone}>
            {contact.phone}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
