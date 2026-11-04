"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import {ArrowUpRight, Clock, PhoneCall, Smartphone} from "lucide-react";
import { DynamicIcon } from "@/components/DynamicIcon";
import { LogoMark } from "@/components/Logo";
import { HeroQr } from "../HeroQr";
import { PlatformButtons } from "../PlatformButtons";
import { Rail } from "../Rail";

// "How to book": a switch between booking in the NepCab app (rides) and booking without it (any
// service, by phone, WhatsApp or at the office). WAI-ARIA tabs: arrow keys move between them.

export type BookingContent = {
  appSteps: { title: string; text: string }[];
  appCardTitle: string;
  offline: { icon: string; title: string; text: string; cta: string; href: string }[];
  offlineNote: string;
};

export function BookingTabs({ content, hours }: { content: BookingContent; hours: string }) {
  const [tab, setTab] = useState<"app" | "offline">("app");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs = [
    { id: "app" as const, label: "In the app", sub: "Rides", icon: Smartphone },
    { id: "offline" as const, label: "Without the app", sub: "Any service", icon: PhoneCall },
  ];
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setTab(tabs[next].id);
    refs.current[next]?.focus();
  };



  return (
    <div className="mt-7 sm:mt-10">
      {/* Switch */}
      <div role="tablist" aria-label="How to book" className="flex w-full gap-1 rounded-2xl sm:inline-flex bg-paper p-1.5 ring-1 ring-line sm:w-auto">
        {tabs.map(({ id, label, sub, icon: Icon }, i) => (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={`book-tab-${id}`}
            role="tab"
            type="button"
            aria-selected={tab === id}
            aria-controls={`book-panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            onKeyDown={(e) => onKey(e, i)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-left transition sm:flex-none sm:justify-start sm:gap-3 sm:px-5 ${
              tab === id ? "bg-navy text-white shadow-[var(--shadow-soft)]" : "text-ink/70 hover:bg-white hover:text-navy"
            }`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${tab === id ? "text-accent" : ""}`} aria-hidden />
            <span className="leading-tight">
              <span className="block whitespace-nowrap font-display text-[14px] font-semibold sm:text-[15px]">{label}</span>
              <span className={`hidden text-[12.5px] sm:inline ${tab === id ? "text-white/65" : "text-ink/55"}`}>{sub}</span>
            </span>
          </button>
        ))}
      </div>

      {/* In the app */}
      <div id="book-panel-app" role="tabpanel" aria-labelledby="book-tab-app" hidden={tab !== "app"} className="animate-fade-up mt-8 [animation-duration:0.45s]">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <Rail as="ol" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {content.appSteps.map(({ title, text }, i) => (
              <li key={title} className="surface-card flex flex-col rounded-[1.5rem] p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-navy">{i + 1}</span>
                <p className="mt-6 font-display text-lg font-semibold leading-snug text-navy">{title}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink/65">{text}</p>
              </li>
            ))}
          </Rail>
          <div className="bg-accent-gradient flex flex-col justify-between gap-5 rounded-[1.5rem] p-6 text-navy">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="type-eyebrow flex items-center gap-2 text-navy/75">
                  <LogoMark className="h-5 w-5" /> NepCab app
                </p>
                <p className="mt-2 font-display text-lg font-bold leading-snug">{content.appCardTitle}</p>
              </div>
              <HeroQr className="hidden w-24 shrink-0 rounded-xl p-1.5 sm:block" />
            </div>
            <PlatformButtons compact />
          </div>
        </div>
      </div>

      {/* Without the app */}
      <div id="book-panel-offline" role="tabpanel" aria-labelledby="book-tab-offline" hidden={tab !== "offline"} className="animate-fade-up mt-8 [animation-duration:0.45s]">
        <ul className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
          {content.offline.map(({ icon, title, text, cta, href }) => {
            const external = href.startsWith("http");
            return (
            <li key={title}>
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="surface-card group grid h-full grid-cols-[auto_1fr_auto] items-center gap-x-4 rounded-[1.25rem] p-4 transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[var(--shadow-lift)] sm:flex sm:flex-col sm:items-start sm:rounded-[1.5rem] sm:p-6"
              >
                <span className="row-span-2 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-navy">
                  <DynamicIcon name={icon} className="h-6 w-6" />
                </span>
                <p className="font-display text-[17px] font-semibold text-navy sm:mt-6 sm:text-lg">{title}</p>
                <ArrowUpRight className="row-span-2 h-5 w-5 text-ink/40 transition group-hover:text-accent-deep sm:hidden" aria-hidden />
                <span className="tabular text-[14px] font-semibold text-accent-deep sm:hidden">{cta}</span>
                <p className="mt-1.5 hidden flex-1 text-[15px] leading-relaxed text-ink/65 sm:block">{text}</p>
                <span className="mt-6 hidden items-center gap-1.5 font-display text-[15px] font-semibold text-navy transition group-hover:text-accent-deep sm:inline-flex">
                  {cta} <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
                </span>
              </a>
            </li>
            );
          })}
        </ul>
        <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] text-ink/65">
          <span>{content.offlineNote}</span>
          {hours && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-accent" aria-hidden /> {hours}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
