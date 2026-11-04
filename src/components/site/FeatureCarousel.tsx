"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { DynamicIcon } from "@/components/DynamicIcon";
import { serviceCover, serviceHref, type ServiceData } from "./brand-services";
import { Reveal } from "./motion";

// The large card that leads the services grid: it cycles through every service (photo crossfade,
// text rising in), linking to whichever one is showing. Pauses on hover or keyboard focus and never
// auto-plays under reduced motion. Every photo is in the page from the start, so changes are instant.

const INTERVAL = 5000;

export function FeatureCarousel({ services }: { services: ServiceData[] }) {
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (held || reduced) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % services.length), INTERVAL);
    return () => clearTimeout(t);
  }, [held, reduced, index, services.length]);

  const s = services[index];
  const count = (n: number) => String(n).padStart(2, "0");

  return (
    <Reveal as="li" from="zoom" className="sm:col-span-2 lg:row-span-2">
      <Link
        href={serviceHref(s)}
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        className="group relative isolate flex h-full min-h-[23rem] sm:min-h-[26rem] flex-col overflow-hidden rounded-[1.75rem] p-7 text-white transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)] sm:p-9"
      >
        {services.map((sv, i) => {
          const photo = serviceCover(sv);
          return photo ? (
            <Image
              key={sv.slug}
              src={photo.src}
              alt={i === index ? photo.alt : ""}
              fill
              sizes="(min-width: 1024px) 760px, 100vw"
              className={`-z-20 object-cover transition-[opacity,transform] duration-1000 ease-out ${
                i === index ? "scale-100 opacity-100" : "scale-105 opacity-0"
              }`}
            />
          ) : null;
        })}
        {/* Neutral scrim so the text stays readable on any photo */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/10" aria-hidden />

        <div className="flex items-center justify-between gap-3">
          <span className="type-eyebrow rounded-full bg-white px-3 py-1.5 text-navy">{s.tag}</span>
          <span className="flex items-center gap-2">
            {s.poweredBy && (
              <span className="hidden items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-xs font-medium text-navy sm:inline-flex">
                <LogoMark className="h-6 w-6" /> Powered by {s.poweredBy.name}
              </span>
            )}
            <span className="tabular rounded-full bg-black/35 px-2.5 py-1 font-display text-xs font-semibold text-white/90">
              {count(index + 1)} / {count(services.length)}
            </span>
          </span>
        </div>

        {/* Keyed by the service, so the text rises in fresh on every change */}
        <div key={s.slug} className="animate-fade-up mt-auto [animation-duration:0.6s]" aria-live="polite">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-navy">
            <DynamicIcon name={s.iconName} className="h-7 w-7" />
          </span>
          <h3 className="type-h2 mt-6 max-w-md text-white">{s.name}</h3>
          <p className="mt-3 max-w-md text-[16px] leading-relaxed text-white/85">{s.summary}</p>
          <span className="mt-8 flex items-center justify-between gap-4">
            <span className="text-sm font-semibold text-white">{s.poweredBy ? "Book a ride" : `Explore ${s.name}`}</span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-navy transition duration-300 group-hover:rotate-45" aria-hidden>
              <ArrowUpRight className="h-4.5 w-4.5" />
            </span>
          </span>
        </div>
      </Link>
    </Reveal>
  );
}
