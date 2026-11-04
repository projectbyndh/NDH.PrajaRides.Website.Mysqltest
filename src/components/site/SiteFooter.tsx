import Link from "next/link";
import { ArrowUp, ArrowUpRight, Clock, Mail, MapPin, Phone, PhoneCall } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { PrajaWordmark } from "@/components/PrajaLogo";
import { FacebookGlyph, InstagramGlyph, TikTokGlyph, WhatsAppGlyph } from "@/components/StoreBadges";
import type { SiteContent } from "@/lib/site-content";
import { AnimatedText } from "./AnimatedText";
import { ButtonLink } from "./Button";
import { HeroQr } from "./HeroQr";
import type { FooterContent, ServiceLink } from "./nav";

const SOCIAL_LINK = "flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white ring-1 ring-white/10 transition hover:bg-accent hover:text-navy hover:ring-accent";

// Site footer, top to bottom:
//   1. An amber call-to-action card straddling the white page and the navy footer
//   2. Brand column | four link columns | contact column with the NepCab app QR
//   3. Copyright, legal links and "back to top"
// Links here are prefetched only once clicked (prefetch={false}): the footer repeats the whole menu
// the header already carries, so letting the browser prefetch both sets asks the server for every
// page on the site twice over, on every single page view.
export function SiteFooter({ content, services, footer: f }: { content: SiteContent; services: ServiceLink[]; footer: FooterContent }) {
  const { contact, social } = content;
  const columns = [{ title: f.servicesTitle, links: services.map(({ href, label }) => ({ href, label })) }, ...f.columns];
  const socials = [
    { href: social.facebook, label: "Facebook", icon: FacebookGlyph },
    { href: social.tiktok, label: "TikTok", icon: TikTokGlyph },
    social.instagram && { href: social.instagram, label: "Instagram", icon: InstagramGlyph },
    social.google && { href: social.google, label: "Find us on Google Maps", icon: MapPin },
  ].filter(Boolean) as { href: string; label: string; icon: typeof MapPin }[];

  return (
    <footer className="relative mt-2 sm:mt-4">
      {/* 1. Call to action, half over the page */}
      <div className="relative z-10 px-4 sm:px-6">
        <div className="bg-accent-gradient mx-auto grid max-w-6xl items-center gap-8 rounded-[2rem] p-8 text-navy shadow-[var(--shadow-lift)] sm:p-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="type-eyebrow flex items-center gap-2 text-navy/75">
              {f.ctaEyebrow}
            </p>
            <AnimatedText as="h2" lines={f.ctaTitle} className="type-h2 mt-4 block text-navy" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <ButtonLink href={`tel:${contact.phone}`} variant="secondary" size="lg" icon={Phone}>
              {contact.phone}
            </ButtonLink>
            <ButtonLink href={`https://wa.me/977${contact.phone}`} variant="light" size="lg" icon={WhatsAppGlyph}>
              {f.whatsappButton}
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="relative -mt-24 overflow-hidden bg-navy pt-24 text-white/70 sm:-mt-28 sm:pt-28">
        {/* 2. Main grid */}
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-14 pt-16 sm:px-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <PrajaWordmark light />
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed">{f.about}</p>
            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-white/[0.05] py-2 pl-2 pr-4 ring-1 ring-white/10">
              <LogoMark className="h-9 w-9 shrink-0" />
              <p className="text-xs leading-snug">
                <span className="block font-semibold text-white">{f.badgeTitle}</span>
                {f.badgeText}
              </p>
            </div>
            <div className="mt-6 flex gap-2">
              {socials.map(({ href, label, icon: Icon }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={SOCIAL_LINK}>
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:col-span-5">
            {columns.map((g, gi) => (
              <div key={gi}>
                <h2 className="type-eyebrow text-accent">{g.title}</h2>
                <ul className="mt-3 text-[14px] lg:mt-5 lg:space-y-3">
                  {g.links.map((n, i) => (
                    <li key={i}>
                      <Link href={n.href} prefetch={false} className="transition hover:text-white">
                        {n.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="lg:col-span-3">
            <h2 className="type-eyebrow text-accent">{f.contactTitle}</h2>
            <ul className="mt-3 text-[14px] lg:mt-5 lg:space-y-3.5">
              <li>
                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-2.5 transition hover:text-white">
                  <Phone className="h-4 w-4 text-accent" aria-hidden /> <span className="tabular">{contact.phone}</span> · {f.callNote}
                </a>
              </li>
              <li>
                <a href={`tel:${contact.tollFree}`} className="inline-flex items-center gap-2.5 transition hover:text-white">
                  <PhoneCall className="h-4 w-4 text-accent" aria-hidden /> {f.tollFree} <span className="tabular">{contact.tollFree}</span>
                </a>
              </li>
              {contact.email && (
                <li>
                  <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-2.5 break-all transition hover:text-white">
                    <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden /> {contact.email}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden /> {contact.address}
              </li>
              {contact.hours && (
                <li className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden /> {contact.hours}
                </li>
              )}
            </ul>

            {/* NepCab app */}
            <Link href="/nepcab" className="group mt-7 flex items-center gap-4 rounded-2xl bg-white/[0.05] p-3 ring-1 ring-white/10 transition hover:bg-white/[0.09]">
              <HeroQr className="w-16 shrink-0 rounded-lg p-1" />
              <span className="text-sm leading-snug">
                <span className="block font-display font-semibold text-white">{f.appTitle}</span>
                {f.appText}
              </span>
              <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-white/55 transition group-hover:text-accent" aria-hidden />
            </Link>
          </div>
        </div>

        {/* 3. Bottom bar */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-6 text-xs sm:px-6">
            <span>{f.copyright}</span>
            <span className="legal-links ml-auto flex flex-wrap items-center gap-x-6 gap-y-2">
              {f.legalLinks.map((l, i) => (
                <Link key={i} href={l.href} prefetch={false} className="transition hover:text-white">
                  {l.label}
                </Link>
              ))}
              <a href="#main" className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-3 py-1.5 font-semibold text-white ring-1 ring-white/10 transition hover:bg-accent hover:text-navy">
                {f.backToTop} <ArrowUp className="h-3.5 w-3.5" aria-hidden />
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
