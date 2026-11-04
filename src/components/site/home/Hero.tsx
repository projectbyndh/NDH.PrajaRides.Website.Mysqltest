import { getBlock, getImageChoices, siteImage } from "@/lib/content/store";
import { HeroShowcase } from "./HeroShowcase";

// Home hero: a slideshow (headline, line and photo change) with the rider / driver buttons, NepCab
// store buttons, QR and badge fixed. Content: admin → Page content → Home → Hero slideshow.

export async function Hero() {
  const [hero, images] = await Promise.all([getBlock("home.hero"), getImageChoices()]);
  const content = {
    ...hero,
    slides: hero.slides.map((s) => ({ title: s.title, line: s.line, image: s.image ? siteImage(s.image, images) : null })),
  };
  return (
    <section className="bg-hero-light relative isolate overflow-hidden px-4 pb-10 pt-2 sm:px-6 sm:pb-20 sm:pt-10 lg:pt-12">
      <div className="bg-grid-ink pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <HeroShowcase content={content} />
    </section>
  );
}
