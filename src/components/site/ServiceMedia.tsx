"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

// Photos on a service page: the slideshow at the top and the photo grid (with a full-screen viewer)
// at the bottom. Photos come from admin → Gallery (tagged with the service) or the placeholders.

export type MediaImage = { src: string; thumb?: string; alt: string; local: boolean };

/** Fills its (positioned) parent, resized for the space it fills (uploaded and placeholder photos alike). */
function Fill({ image, sizes, priority = false, eager = priority, className = "" }: { image: MediaImage; sizes: string; priority?: boolean; eager?: boolean; thumb?: boolean; className?: string }) {
  return <Image src={image.src} alt={image.alt} fill sizes={sizes} preload={priority} loading={eager ? "eager" : undefined} className={`object-cover ${className}`} />;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

const arrowBtn =
  "flex h-11 w-11 items-center justify-center rounded-xl bg-white/90 text-navy shadow-[var(--shadow-soft)] backdrop-blur-sm transition hover:bg-white focus-visible:outline-2 focus-visible:outline-accent";

/** Hero slideshow: crossfade with a slow zoom every 5s; a counter, and thumbnails to pick a photo. */
export function ServiceCarousel({ images, label }: { images: MediaImage[]; label: string }) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const reduced = useReducedMotion();
  const count = images.length;
  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);

  useEffect(() => {
    if (held || reduced || count < 2) return;
    const t = setTimeout(() => go(1), 5000);
    return () => clearTimeout(t);
  }, [held, reduced, count, index, go]);

  if (!count) return null;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${label} photos`}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-paper shadow-[var(--shadow-lift)] sm:rounded-[2rem] lg:aspect-[16/11]">
        {images.map((img, i) => (
          <div key={img.src} className={`absolute inset-0 transition-opacity duration-1000 ease-out ${i === index ? "opacity-100" : "opacity-0"}`} aria-hidden={i !== index}>
            <Fill image={img} sizes="(min-width: 1024px) 680px, 100vw" priority={i === 0} eager className={i === index && !reduced ? "hero-kenburns" : ""} />
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" aria-hidden />

        {count > 1 && (
          <>
            <span className="tabular absolute bottom-6 left-5 font-display text-sm font-semibold text-white" aria-live="polite">
              {pad(index + 1)} <span className="text-white/60">/ {pad(count)}</span>
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="mt-3 flex gap-2">
          {images.slice(0, 5).map((img, i) => (
            <li key={img.src} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={`relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-paper transition ${
                  i === index ? "ring-2 ring-accent ring-offset-2" : "opacity-70 hover:opacity-100"
                }`}
              >
                <Fill image={img} sizes="120px" thumb />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Photo grid (first photo large) that opens a full-screen viewer with arrows and keyboard keys. */
export function ServicePhotoGrid({ images }: { images: MediaImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const count = images.length;
  const shown = images.slice(0, 7);
  const close = () => setOpen(null);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + count) % count)), [count]);

  useEffect(() => {
    if (open === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, step]);

  return (
    <>
      <ul className="grid auto-rows-[9rem] grid-cols-2 gap-3 sm:auto-rows-[11rem] md:grid-cols-4 md:gap-4">
        {shown.map((img, i) => (
          // First photo large; with an odd number of small ones, the last one widens to fill the row
          <li key={img.src} className={i === 0 ? "col-span-2 row-span-2" : i === shown.length - 1 && (shown.length - 1) % 2 === 1 ? "col-span-2" : ""}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`View photo: ${img.alt || `photo ${i + 1}`}`}
              className="group relative block h-full w-full overflow-hidden rounded-[1.25rem] bg-paper"
            >
              <Fill image={img} sizes={i === 0 ? "(min-width: 768px) 560px, 100vw" : "(min-width: 768px) 280px, 50vw"} thumb={i !== 0} className="transition duration-700 group-hover:scale-[1.05]" />
              <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" aria-hidden />
              <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 text-navy opacity-0 transition group-hover:opacity-100" aria-hidden>
                <Expand className="h-4 w-4" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {open !== null && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-night/95" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={close}>
          <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6">
            <span className="tabular font-display text-sm font-semibold">
              {open + 1} / {count}
            </span>
            <button type="button" onClick={close} aria-label="Close" className="flex h-11 w-11 items-center justify-center rounded-xl text-white hover:bg-white/10">
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="relative mx-auto w-full max-w-5xl flex-1 px-4 pb-6 sm:px-16" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-full w-full">
              <Fill image={images[open]} sizes="100vw" priority className="!object-contain" />
            </div>
            {count > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} aria-label="Previous photo" className={`${arrowBtn} absolute left-2 top-1/2 -translate-y-1/2 sm:left-0`}>
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <button type="button" onClick={() => step(1)} aria-label="Next photo" className={`${arrowBtn} absolute right-2 top-1/2 -translate-y-1/2 sm:right-0`}>
                  <ChevronRight className="h-5 w-5" aria-hidden />
                </button>
              </>
            )}
          </div>
          {images[open].alt && <p className="px-4 pb-5 text-center text-sm text-white/70" onClick={(e) => e.stopPropagation()}>{images[open].alt}</p>}
        </div>
      )}
    </>
  );
}
