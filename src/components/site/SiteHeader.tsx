"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, Phone, PhoneCall, X } from "lucide-react";
import { WhatsAppGlyph } from "@/components/StoreBadges";
import { LogoMark } from "@/components/Logo";
import { PrajaEmblem } from "@/components/PrajaLogo";
import { BRAND } from "@/lib/config";
import { DynamicIcon } from "@/components/DynamicIcon";
import type { NavContent, ServiceLink } from "./nav";
import { ButtonLink } from "./Button";
import { HeroQr } from "./HeroQr";

type Props = { phone?: string; tollFree?: string; services: ServiceLink[]; nav: NavContent };

/** The header highlights the current page; on pages whose path is only known at request time
 * (e.g. /news/[slug]) the same header renders without a highlight until the path streams in. */
export function SiteHeader(props: Props) {
  return (
    <Suspense fallback={<HeaderBar {...props} pathname={null} />}>
      <HeaderWithPath {...props} />
    </Suspense>
  );
}

function HeaderWithPath(props: Props) {
  return <HeaderBar {...props} pathname={usePathname()} />;
}

/**
 * A full-width bar, edge to edge:
 *   top of the page   transparent; navy text; the current page is marked with an amber dot
 *   scrolled / menu   solid navy, a little shorter, white text
 * Desktop "Services" opens a full-width panel with every service; mobile opens a full-screen sheet.
 */
function HeaderBar({ phone = BRAND.whatsapp, tollFree = BRAND.tollFree, services, nav, pathname }: Props & { pathname: string | null }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile sheet: lock the page behind it and close on Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (href: string) => pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const solid = scrolled || open;
  const close = () => setOpen(false);

  const linkClass = (active: boolean) =>
    `relative inline-flex h-full items-center gap-1 whitespace-nowrap px-2.5 text-[14px] font-medium transition-colors xl:px-3.5 xl:text-[15px] ${
      solid ? (active ? "text-white" : "text-white/70 hover:text-white") : active ? "text-navy" : "text-ink/70 hover:text-navy"
    }`;

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-[background-color,box-shadow] duration-300 ${
        solid ? "bg-navy shadow-[0_12px_32px_-18px_rgb(2_10_31/0.6)]" : "bg-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center gap-4 px-4 transition-[height] duration-300 ease-[var(--ease-out-expo)] sm:px-6 lg:px-8 ${
          solid ? "h-16" : "h-16 lg:h-20"
        }`}
      >
        <Link
          href="/"
          onClick={close}
          aria-label="Praja Ride home"
          className="group flex shrink-0 items-center gap-2.5 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:gap-3"
        >
          <PrajaEmblem className={`${solid ? "h-11 w-11" : "h-12 w-12 lg:h-14 lg:w-14"}`} priority />
          {/* The name only: the emblem carries "Pvt. Ltd." */}
          <span
            className={`font-display text-[19px] font-extrabold uppercase leading-none tracking-[0.02em] transition-colors duration-300 sm:text-[21px] ${solid ? "text-white" : "text-navy"}`}
          >
            Praja <span className="text-accent">Ride</span>
          </span>
        </Link>

        {/* Desktop links, centred */}
        <nav aria-label="Main" className="mx-auto hidden h-full items-stretch lg:flex">
          {nav.main.map((n) => {
            const active = isActive(n.href);
            return n.href === "/services" ? (
              <ServicesMenu key={n.href} active={active} label={n.label} className={linkClass(active)} phone={phone} tollFree={tollFree} services={services} nav={nav} />
            ) : (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={linkClass(active)}>
                {n.label}
                {active && <ActiveDot />}
              </Link>
            );
          })}
        </nav>

        {/* Desktop actions */}
        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <a
            href={`https://wa.me/977${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`WhatsApp ${phone}`}
            className={`hidden h-10 w-10 items-center justify-center rounded-lg ring-1 transition xl:flex ${
              solid ? "text-white ring-white/20 hover:bg-white/10" : "text-navy ring-line hover:bg-paper"
            }`}
          >
            <WhatsAppGlyph className="h-[18px] w-[18px]" />
          </a>
          <ButtonLink href={`tel:${phone}`} size="sm" icon={Phone}>
            {phone}
          </ButtonLink>
        </div>

        {/* Mobile actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2 lg:hidden">
          <a href={`tel:${phone}`} aria-label={`Call ${phone}`} className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-navy">
            <Phone className="h-5 w-5" aria-hidden />
          </a>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 transition ${
              solid ? "bg-white/10 text-white ring-white/20" : "bg-white text-navy ring-line"
            }`}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && <MobileSheet isActive={isActive} close={close} phone={phone} services={services} nav={nav} />}
    </header>
  );
}

/** Small amber dot under the current page's link (no underlines on this site). */
function ActiveDot() {
  return <span className="absolute bottom-3 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-accent" aria-hidden />;
}

/**
 * Desktop "Services" with a full-width panel (opens on hover and keyboard focus):
 * six service tiles with photos on the left, the NepCab app and a phone line on the right.
 * The wrapper is not positioned, so the panel spans the whole header.
 */
// The menu that is on screen is prefetched as usual. Links behind a closed dropdown or inside the
// mobile sheet are not (prefetch={false}): they sit in the markup of every page but hidden, so
// prefetching them asks the server for pages nobody has asked to see. On a shared host, that
// request storm is what the web server in front answers with "the server is temporarily busy".
function ServicesMenu({ label, active, className, phone, tollFree, services, nav }: { label: string; active: boolean; className: string; phone: string; tollFree: string; services: ServiceLink[]; nav: NavContent }) {
  const show = "group-hover/menu:visible group-hover/menu:translate-y-0 group-hover/menu:opacity-100 group-focus-within/menu:visible group-focus-within/menu:translate-y-0 group-focus-within/menu:opacity-100";
  return (
    <div className="group/menu flex">
      <Link href="/services" aria-current={active ? "page" : undefined} aria-haspopup="true" className={className}>
        {label}
        <ChevronDown className="h-4 w-4 transition duration-300 group-hover/menu:rotate-180 group-focus-within/menu:rotate-180" aria-hidden />
        {active && <ActiveDot />}
      </Link>

      <div className={`invisible absolute inset-x-0 top-full -translate-y-1 opacity-0 transition duration-300 ease-[var(--ease-out-expo)] ${show}`}>
        <div className="border-y border-line bg-white text-ink shadow-[0_30px_60px_-30px_rgb(2_10_31/0.35)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-8 py-8 lg:grid-cols-[1fr_19rem]">
            <div>
              <div className="flex items-baseline justify-between">
                <p className="type-eyebrow text-ink/65">{nav.servicesTitle}</p>
                <Link href="/services" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy transition hover:text-accent">
                  {nav.allServices} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <ul className="mt-5 grid grid-cols-3 gap-4">
                {services.map(({ href, label: name, summary, iconName, image: img }) => {
                  return (
                    <li key={href}>
                      <Link href={href} prefetch={false} className="group/item flex gap-3.5 rounded-2xl p-2 transition hover:bg-paper">
                        <span className="relative h-[4.5rem] w-24 shrink-0 overflow-hidden rounded-xl bg-paper">
                          {img && (
                            <Image src={img.src} alt="" fill sizes="96px" className="object-cover transition duration-500 group-hover/item:scale-105" />
                          )}
                          <span className="absolute bottom-1.5 left-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white text-accent shadow-sm">
                            <DynamicIcon name={iconName} className="h-4 w-4" />
                          </span>
                        </span>
                        <span className="min-w-0 py-0.5">
                          <span className="flex items-center gap-1 font-display text-[15px] font-semibold text-navy">
                            {name}
                            <ArrowUpRight className="h-3.5 w-3.5 text-ink/40 transition group-hover/item:text-accent" aria-hidden />
                          </span>
                          <span className="mt-1 line-clamp-2 block text-[13px] leading-snug text-ink/65">{summary}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex flex-col gap-3 border-l border-line pl-8">
              <Link href="/nepcab" className="group/app flex items-center gap-4 rounded-2xl bg-accent-soft p-3 transition hover:bg-accent/25">
                <HeroQr className="w-20 shrink-0 rounded-xl p-1" />
                <span className="text-sm leading-snug">
                  <span className="flex items-center gap-1.5 font-display font-semibold text-navy">
                    <LogoMark className="h-5 w-5" /> {nav.appTitle}
                  </span>
                  <span className="mt-1 block text-ink/70">{nav.appText}</span>
                </span>
              </Link>
              <a href={`tel:${phone}`} className="flex items-center gap-3 rounded-2xl p-3 ring-1 ring-line transition hover:bg-paper">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-accent">
                  <Phone className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="text-sm leading-snug">
                  <span className="block text-ink/65">{nav.callPrompt}</span>
                  <span className="tabular font-display font-semibold text-navy">{phone}</span>
                </span>
              </a>
              <a href={`tel:${tollFree}`} className="flex items-center gap-2 px-3 text-sm text-ink/65 transition hover:text-navy">
                <PhoneCall className="h-4 w-4 text-accent" aria-hidden /> {nav.tollFree} <span className="tabular font-semibold">{tollFree}</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mobile: a full-screen white sheet under the bar. */
function MobileSheet({ isActive, close, phone, services, nav }: { isActive: (href: string) => boolean; close: () => void; phone: string; services: ServiceLink[]; nav: NavContent }) {
  return (
    <nav
      id="mobile-menu"
      aria-label="Main"
      className="animate-fade-in fixed inset-x-0 bottom-0 top-16 flex flex-col bg-white [animation-duration:0.25s] lg:hidden"
    >
      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-5 sm:px-6">
        <p className="type-eyebrow text-ink/65">{nav.servicesTitle}</p>
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {services.map(({ href, label, iconName, image: img }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  prefetch={false}
                  onClick={close}
                  aria-current={active ? "page" : undefined}
                  className={`block overflow-hidden rounded-2xl ring-1 ${active ? "ring-2 ring-accent" : "ring-line"}`}
                >
                  <span className="relative block aspect-[16/9] bg-paper">
                    {img && <Image src={img.src} alt="" fill sizes="50vw" className="object-cover" />}
                  </span>
                  <span className="flex items-center gap-2 p-2.5 text-[14px] font-semibold leading-tight text-navy">
                    <DynamicIcon name={iconName} className="h-4 w-4 shrink-0 text-accent" />
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <ul className="mt-6 border-t border-line">
          {nav.main.filter((n) => n.href !== "/services").map((n) => {
            const active = isActive(n.href);
            return (
              <li key={n.href} className="border-b border-line">
                <Link
                  href={n.href}
                  prefetch={false}
                  onClick={close}
                  aria-current={active ? "page" : undefined}
                  className="flex items-center justify-between py-4 font-display text-xl font-semibold text-navy"
                >
                  <span className="flex items-center gap-3">
                    {n.label}
                    {active && <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />}
                  </span>
                  <ArrowUpRight className="h-5 w-5 text-ink/40" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          {nav.more.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              prefetch={false}
              onClick={close}
              className={`rounded-full px-4 py-2.5 text-sm font-medium ring-1 ring-line ${isActive(n.href) ? "bg-accent-soft text-navy" : "text-ink/70"}`}
            >
              {n.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Always-visible contact bar at the bottom of the sheet */}
      <div className="grid grid-cols-2 gap-2 border-t border-line bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        <ButtonLink href={`tel:${phone}`} icon={Phone} full>
          {nav.callButton}
        </ButtonLink>
        <ButtonLink href={`https://wa.me/977${phone}`} variant="secondary" icon={WhatsAppGlyph} full>
          {nav.whatsappButton}
        </ButtonLink>
      </div>
    </nav>
  );
}
