"use client";

import { useEffect, useRef, useState, type PointerEvent, type TouchEvent } from "react";
import Image from "next/image";
import { Car, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { useIdentity } from "@/components/IdentityProvider";
import type { SiteImage } from "@/lib/site-images";
import { ButtonLink } from "../Button";
import { HeroQr } from "../HeroQr";
import { PlatformButtons } from "../PlatformButtons";

// Home hero: ride sharing only, as one slideshow. Each slide changes the headline, line and photo;
// the buttons (book a ride / register as a driver), store links, QR card and badge stay put.
// Slides change every few seconds; it pauses on hover or keyboard focus, and never auto-plays
// under reduced motion.
// Slides are stacked in one grid cell, so the height never jumps; only the first is the page's h1.
// Phones: the photo comes first (above the headline), can be swiped, and shows dots.

export type HeroSlide = { title: string; line: string; image: SiteImage | null };
export type HeroContent = {
  slides: HeroSlide[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  appLabel: string;
  qrTitle: string;
  qrText: string;
};

const INTERVAL = 6000;

/** Slides and labels come from admin → Page content → Home → Hero slideshow. */
export function HeroShowcase({ content }: { content: HeroContent }) {
  const { city } = useIdentity();
  const slides = content.slides.length ? content.slides : [{ title: "", line: "", image: null }];
  const [index, setIndex] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const playing = !hovering && !reduced;
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % slides.length), INTERVAL);
    return () => clearTimeout(t);
  }, [playing, index, slides.length]);

  // Only a real mouse pauses it: on phones a tap fires "mouseenter" and would stop the slideshow for good.
  const hold = {
    onPointerEnter: (e: PointerEvent) => e.pointerType === "mouse" && setHovering(true),
    onPointerLeave: (e: PointerEvent) => e.pointerType === "mouse" && setHovering(false),
  };
  const go = (step: number) => setIndex((i) => (i + step + slides.length) % slides.length);

  // Swipe left / right on the photo
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swipe = {
    onTouchStart: (e: TouchEvent) => {
      touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    onTouchEnd: (e: TouchEvent) => {
      const t = touch.current;
      touch.current = null;
      if (!t) return;
      const dx = e.changedTouches[0].clientX - t.x;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.changedTouches[0].clientY - t.y)) go(dx < 0 ? 1 : -1);
    },
  };

  return (
    <div className="mx-auto grid max-w-6xl items-center gap-7 sm:gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16" role="region" aria-roledescription="carousel" aria-label="Praja Ride services">
      {/* Left: tabs, the changing text, then the fixed store buttons */}
      <div
        {...hold}
        // Keyboard focus holds the slide; a mouse click on a tab doesn't.
        onFocus={(e) => e.target.matches(":focus-visible") && setHovering(true)}
        onBlur={() => setHovering(false)}
      >
        {/* Slides stacked in one cell: the tallest sets the height */}
        <div className="grid">
          {slides.map((s, i) => {
            const active = i === index;
            const Title = i === 0 ? "h1" : "h2";
            const words = s.title.split(/\s+/).filter(Boolean);
            return (
              <div
                // A new key each time the slide shows replays the word animation
                key={active ? `on-${i}` : `off-${i}`}
                className={`[grid-area:1/1] self-end transition-opacity duration-300 ${active ? "visible opacity-100" : "invisible opacity-0"}`}
                aria-hidden={!active}
                inert={!active}
              >
                <Title className="type-display text-navy" aria-label={s.title}>
                  {words.map((w, wi) => (
                    <span key={wi} aria-hidden>
                      <span className="hero-word">
                        <span style={{ animationDelay: `${120 + wi * 70}ms` }}>{w}</span>
                      </span>
                      {wi < words.length - 1 && " "}
                    </span>
                  ))}
                </Title>
                <p className="type-lead animate-fade-up mt-3 max-w-md font-medium text-ink/70 [animation-duration:0.8s] sm:mt-5" style={{ animationDelay: `${260 + words.length * 70}ms` }}>
                  {s.line}
                </p>
              </div>
            );
          })}
        </div>

        {/* Phones: full-width and stacked, easy to hit with a thumb */}
        <div className="animate-fade-up delay-300 mt-6 grid grid-cols-1 gap-2.5 sm:mt-8 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <ButtonLink href={content.primaryHref || "/nepcab"} size="lg" arrow="right" full className="sm:w-auto">
            {content.primaryLabel}
          </ButtonLink>
          <ButtonLink href={content.secondaryHref || "/drive#apply"} variant="secondary" size="lg" icon={Car} full className="sm:w-auto">
            {content.secondaryLabel}
          </ButtonLink>
        </div>

        {/* Fixed: NepCab store buttons */}
        <div className="animate-fade-up delay-500 mt-6 max-w-md border-t border-line pt-5 sm:mt-8">
          <p className="type-eyebrow flex items-center gap-2 text-ink/65">
            <LogoMark className="h-5 w-5" /> {content.appLabel}
          </p>
          <div className="mt-3">
            <PlatformButtons compact />
          </div>
        </div>
      </div>

      {/* Right: photos in sync with the slides, NepCab badge, QR */}
      <div className="relative order-first mx-auto w-full max-w-[34rem] pr-4 pt-4 sm:pb-10 sm:pr-10 sm:pt-6 lg:order-none lg:pl-8" {...hold}>
        <div className="hero-in-up bg-dots absolute left-0 top-0 h-28 w-28 [animation-delay:700ms] lg:left-4" aria-hidden />
        <div className="hero-in-grow absolute bottom-2 right-0 h-2/5 w-2/5 rounded-[2rem] bg-accent [animation-delay:500ms]" aria-hidden />

        <div className="hero-in-wipe relative overflow-hidden rounded-[1.5rem] rounded-tl-[4rem] bg-paper shadow-[var(--shadow-lift)] sm:rounded-[2rem] sm:rounded-tl-[8rem]">
          <div className="relative aspect-[4/3] touch-pan-y sm:aspect-[5/4] lg:aspect-[4/5]" {...swipe}>
            {slides.map((s, i) => (
              <div key={i} className={`absolute inset-0 transition-opacity duration-1000 ease-out ${i === index ? "opacity-100" : "opacity-0"}`} aria-hidden={i !== index}>
                {s.image && (
                  <Image
                    src={s.image.src}
                    alt={s.image.alt}
                    fill
                    preload={i === 0}
                    sizes="(min-width: 1024px) 480px, 100vw"
                    className={`object-cover ${i === index && !reduced ? "hero-kenburns" : ""}`}
                  />
                )}
              </div>
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" aria-hidden />

            {/* Which slide is showing; tap a dot to jump */}
            {slides.length > 1 && (
              <div className="absolute bottom-11 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/25 px-2.5 py-2 backdrop-blur-sm sm:hidden">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Show slide ${i + 1} of ${slides.length}`}
                    aria-current={i === index}
                    className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? "w-6 bg-accent" : "w-1.5 bg-white/70"}`}
                  />
                ))}
              </div>
            )}

          </div>
        </div>

        {/* NepCab badge with a turning "official franchise" ring */}
        <div className="hero-in-pop absolute right-0 top-0 h-[4.75rem] w-[4.75rem] [animation-delay:900ms] sm:h-32 sm:w-32 lg:h-36 lg:w-36">
          <div className="relative h-full w-full rounded-full bg-white shadow-[var(--shadow-lift)] ring-1 ring-line">
            <svg viewBox="0 0 100 100" className="animate-spin-ring absolute inset-0 h-full w-full text-navy" aria-hidden>
              <defs>
                <path id="hero-ring" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
              </defs>
              <text className="font-display" fontSize="7.6" fontWeight="700" fill="currentColor">
                <textPath href="#hero-ring" textLength="236" lengthAdjust="spacing">
                  OFFICIAL NEPCAB FRANCHISE · {city.toUpperCase()} ·
                </textPath>
              </text>
            </svg>
            <LogoMark className="absolute left-1/2 top-1/2 h-[54%] w-[54%] -translate-x-1/2 -translate-y-1/2" title={`NepCab, official franchise in ${city}`} />
          </div>
        </div>

        {/* Fixed: NepCab QR (tablet/desktop) */}
        <div className="hero-in-up surface-card absolute bottom-0 left-0 hidden items-center gap-5 rounded-[1.5rem] p-4 pr-6 [animation-delay:1100ms] sm:flex lg:-left-4">
          <HeroQr className="w-32 shrink-0 rounded-xl p-1.5 ring-1 ring-line lg:w-36" />
          <p className="max-w-[11rem] leading-snug">
            <span className="type-eyebrow flex items-center gap-1.5 text-ink/65">
              <LogoMark className="h-4 w-4" /> NepCab app
            </span>
            <span className="mt-2 block font-display text-lg font-bold text-navy">{content.qrTitle}</span>
            <span className="mt-1 block text-[13px] text-ink/65">{content.qrText}</span>
          </p>
        </div>

        {/* Phones: checked drivers (a QR is no use on the phone itself) */}
        <div className="hero-in-up surface-card relative z-10 -mt-6 ml-4 mr-0 flex items-center gap-3.5 rounded-2xl p-3.5 [animation-delay:1100ms] sm:hidden">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm leading-snug">
            <span className="block font-display font-semibold text-navy">Checked local drivers</span>
            <span className="text-ink/65">Licence, bluebook &amp; insurance</span>
          </p>
        </div>
      </div>
    </div>
  );
}
