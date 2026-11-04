import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowUpRight, Check, ChevronRight, Phone, Store } from "lucide-react";
import { WhatsAppGlyph } from "@/components/StoreBadges";
import { DynamicIcon } from "@/components/DynamicIcon";
import { ContactForm } from "@/app/(site)/contact/ContactForm";
import { LogoMark } from "@/components/Logo";
import { AnimatedText } from "@/components/site/AnimatedText";
import { serviceCover, serviceHref, servicePhotos, serviceWhatsAppUrl, withIcon } from "@/components/site/brand-services";
import { getService, getServices } from "@/lib/services";
import { ButtonLink } from "@/components/site/Button";
import { ServiceCarousel, ServicePhotoGrid, type MediaImage } from "@/components/site/ServiceMedia";
import { HeroQr } from "@/components/site/HeroQr";
import { Reveal } from "@/components/site/motion";
import { PlatformButtons } from "@/components/site/PlatformButtons";
import { Faq, Section, SectionTitle } from "@/components/site/ui";
import { fillService } from "@/lib/content/pages/services";
import { getBlock } from "@/lib/content/store";
import { photoUrl } from "@/lib/media";
import { getServicePhotos } from "@/lib/photos";
import { getSiteContent } from "@/lib/site-content";
import { BookRideForm } from "@/app/(site)/nepcab/BookRideForm";

// One page per Praja Ride service, all in the same layout:
//   1. Breadcrumb; headline, intro and actions beside a photo slideshow; a quick-facts strip
//   2. What you get (title left, feature cards right)
//   3. How it works (numbered steps) beside the NepCab app card or the ways to book
//   Photos: the service's photos in a grid with a full-screen viewer
//   4. FAQ beside the enquiry form (tagged with this service); on the booking page, beside the help card
//   5. The other services as a compact row
// Offline booking shows the same "Book a ride" card as /nepcab in place of the hero slideshow (its
// photos still appear further down), so booking looks the same everywhere.

/** The service whose page takes ride bookings. */
const BOOKING_SLUG = "offline-booking";

type Props = PageProps<"/services/[slug]">;

// Services added later in admin render on first visit.
export async function generateStaticParams() {
  return (await getServices()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [s, d] = await Promise.all([getService((await params).slug), getBlock("services.detail")]);
  if (!s) return { title: d.servicesLabel };
  const vars = { service: s.name, summary: s.summary };
  return { title: fillService(d.seoTitle, vars), description: fillService(d.seoDescription, vars) };
}

// The slug is only known per request (services can be added in admin), so the page streams in.
export default function ServicePage({ params }: Props) {
  return (
    <Suspense fallback={<div className="bg-hero-light h-[520px]" />}>
      <ServiceBody params={params} />
    </Suspense>
  );
}

async function ServiceBody({ params }: Pick<Props, "params">) {
  const data = await getService((await params).slug);
  if (!data) notFound();
  const s = withIcon(data);
  const [{ contact }, d, t, form, book] = await Promise.all([
    getSiteContent(),
    getBlock("services.detail"),
    getBlock("services.sections"),
    getBlock("contact.form"),
    getBlock("nepcab.book"),
  ]);
  const takesBookings = s.slug === BOOKING_SLUG;
  const f = (text: string) => fillService(text, { service: s.name, serviceLower: s.name.toLowerCase(), app: s.poweredBy?.name ?? "", count: s.steps.length });
  const Icon = s.icon;
  const others = (await getServices()).filter((o) => o.slug !== s.slug).map(withIcon);

  // Photos tagged with this service in admin → Gallery; otherwise the photos picked in admin → Services
  const uploaded = await getServicePhotos(s.slug);
  const photos: MediaImage[] = uploaded.length
    ? uploaded.map((p) => ({ src: photoUrl(p.id), thumb: photoUrl(p.id, "thumb"), alt: p.caption, local: true }))
    : servicePhotos(s).map((img) => ({ src: img.src, alt: img.alt, local: false }));

  const facts = d.facts.map((x) => ({ icon: x.icon, title: f(x.title), text: f(s.poweredBy && x.appText ? x.appText : x.text) }));

  // "Something else?" card with call and WhatsApp, shown with the FAQ.
  const helpCard = (
    <div className={`rounded-[1.5rem] bg-accent-soft p-6 ${takesBookings ? "" : "mt-8"}`}>
      <p className="font-display text-lg font-bold text-navy">{t.elseTitle}</p>
      <p className="mt-1 text-[15px] text-ink/70">{t.elseText}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <ButtonLink href={`tel:${contact.phone}`} variant="secondary" size="sm" icon={Phone}>
          {contact.phone}
        </ButtonLink>
        <ButtonLink href={serviceWhatsAppUrl(contact.phone, s)} variant="outline" size="sm" icon={WhatsAppGlyph}>
          {d.whatsappLabel}
        </ButtonLink>
      </div>
    </div>
  );

  const ways = [
    { icon: Phone, title: t.callTitle, value: contact.phone, href: `tel:${contact.phone}` },
    { icon: WhatsAppGlyph, title: t.whatsappTitle, value: t.whatsappValue, href: serviceWhatsAppUrl(contact.phone, s), external: true },
    { icon: Store, title: t.walkInTitle, value: contact.address, href: "/contact" },
  ];

  return (
    <>
      {/* 1. Hero: text left, photo slideshow right */}
      <section className="bg-hero-light relative isolate overflow-hidden px-4 pb-12 pt-6 sm:px-6 sm:pb-14 sm:pt-8">
        <div className="bg-grid-ink pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-6xl">
          <nav aria-label="Breadcrumb" className="animate-fade-up">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink/65">
              <li>
                <Link href="/" className="-my-1 inline-block py-1 transition hover:text-navy">{d.homeLabel}</Link>
                <ChevronRight className="ml-1.5 inline h-3.5 w-3.5 text-ink/40" aria-hidden />
              </li>
              <li>
                <Link href="/services" className="-my-1 inline-block py-1 transition hover:text-navy">{d.servicesLabel}</Link>
                <ChevronRight className="ml-1.5 inline h-3.5 w-3.5 text-ink/40" aria-hidden />
              </li>
              <li aria-current="page" className="font-medium text-navy">{s.name}</li>
            </ol>
          </nav>

          <div className="mt-6 grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
            <div>
              <p className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-navy ring-1 ring-line">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {s.name}
              </p>
              <AnimatedText as="h1" immediate startDelay={120} lines={[s.headline]} className="type-h1 mt-6 block text-navy" />
              <p className="type-lead animate-fade-up delay-200 mt-5 max-w-xl text-ink/70">{s.intro}</p>
              <div className="animate-fade-up delay-300 mt-8 flex flex-wrap gap-3">
                {takesBookings ? (
                  <ButtonLink href="#book" size="lg" arrow="right" className="lg:hidden">
                    {book.title}
                  </ButtonLink>
                ) : s.poweredBy ? (
                  <ButtonLink href={s.poweredBy.href} size="lg" arrow="right">
                    {f(d.bookAppLabel)}
                  </ButtonLink>
                ) : (
                  <ButtonLink href="#enquire" size="lg" arrow="right">
                    {d.enquireLabel}
                  </ButtonLink>
                )}
                <ButtonLink href={serviceWhatsAppUrl(contact.phone, s)} variant="outline" size="lg" icon={WhatsAppGlyph}>
                  {d.whatsappLabel}
                </ButtonLink>
              </div>
              <div className="animate-fade-up delay-500 mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
                <a href={`tel:${contact.phone}`} className="inline-flex items-center gap-2 text-[15px] text-ink/70 transition hover:text-navy">
                  <Phone className="h-4 w-4 text-accent" aria-hidden /> {d.orCallLabel} <span className="tabular font-semibold text-navy">{contact.phone}</span>
                </a>
                {s.poweredBy && (
                  <Link href={s.poweredBy.href} className="inline-flex items-center gap-2 text-[13.5px] font-medium text-ink/65 transition hover:text-navy">
                    <LogoMark className="h-6 w-6" /> {f(d.poweredByLabel)}
                  </Link>
                )}
              </div>
            </div>

            {takesBookings ? (
              <div id="book" className="animate-fade-in delay-200 scroll-mt-24 lg:ml-auto lg:w-full lg:max-w-lg">
                <div className="rounded-[2rem] bg-white p-5 shadow-[var(--shadow-lift)] ring-1 ring-line sm:p-8">
                  <BookRideForm text={book} whatsapp={contact.phone} />
                </div>
              </div>
            ) : (
              <div className="hero-in-photo">
                <ServiceCarousel images={photos} label={s.name} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick facts */}
      <div className="border-y border-line bg-white px-4 sm:px-6">
        <ul className="mx-auto grid max-w-6xl divide-line sm:grid-cols-3 sm:divide-x">
          {facts.map(({ icon, title, text }, i) => (
            <li key={title + i} className="flex items-center gap-4 border-b border-line py-5 last:border-b-0 sm:border-b-0 sm:px-6 sm:first:pl-0 sm:last:pr-0">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <DynamicIcon name={icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 leading-snug">
                <span className="block font-display font-semibold text-navy">{title}</span>
                <span className="text-[14px] text-ink/65">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 2. What you get */}
      <Section tight className="border-t border-line">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionTitle eyebrow={s.name} title={f(t.getTitle)} intro={s.summary} />
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {s.features.map((f, i) => (
              <Reveal
                as="li"
                key={f.title}
                delay={i * 90}
                className={`surface-card flex gap-4 rounded-[1.5rem] p-5 sm:block sm:p-7 ${i === 0 && s.features.length % 2 === 1 ? "sm:col-span-2" : ""}`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Check className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="type-h3 text-navy sm:mt-5">{f.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink/65 sm:mt-2 sm:text-[15.5px]">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* 3. How it works + app / ways to book */}
      <Section tight className="border-t border-line">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          <div>
            <SectionTitle eyebrow={t.stepsEyebrow} title={f(t.stepsTitle)} />
            <ol className="mt-8 space-y-3">
              {s.steps.map((step, i) => (
                <Reveal as="li" key={step.title} delay={i * 100} className="flex gap-5 rounded-[1.5rem] p-5 ring-1 ring-line">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent font-display text-lg font-bold text-navy">{i + 1}</span>
                  <span className="pt-0.5">
                    <span className="type-h3 block text-navy">{step.title}</span>
                    <span className="mt-1 block text-[15px] leading-relaxed text-ink/65">{step.text}</span>
                  </span>
                </Reveal>
              ))}
            </ol>
          </div>

          {s.poweredBy ? (
            <Reveal delay={150} className="bg-accent-gradient flex flex-col rounded-[2rem] p-7 text-navy sm:p-9 lg:self-center">
              <p className="type-eyebrow flex items-center gap-2 text-navy/75">
                <LogoMark className="h-5 w-5" /> {f(t.appEyebrow)}
              </p>
              <h3 className="type-h3 mt-4 text-navy">{f(t.appTitle)}</h3>
              <p className="mt-2 text-[15px] text-navy/80">{f(t.appText)}</p>
              <HeroQr className="mt-6 hidden w-40 rounded-2xl p-2 sm:block" />
              <div className="mt-6">
                <PlatformButtons compact />
              </div>
            </Reveal>
          ) : (
            <div className="lg:self-center">
              <Reveal>
                <p className="type-eyebrow text-ink/65">{t.waysEyebrow}</p>
              </Reveal>
              <ul className="mt-4 space-y-3">
                {ways.map(({ icon: WayIcon, title, value, href, external }, i) => (
                  <Reveal as="li" key={title} delay={i * 80}>
                    <a
                      href={href}
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="surface-card group flex items-center gap-4 rounded-[1.25rem] p-4 transition hover:border-accent/50"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-navy">
                        <WayIcon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="type-eyebrow block text-ink/65">{title}</span>
                        <span className="mt-1 block truncate font-display text-[16px] font-semibold text-navy">{value}</span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-ink/40 transition group-hover:text-accent" aria-hidden />
                    </a>
                  </Reveal>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* Photos */}
      {/* The hero shows the slideshow, so only repeat photos here when there are more (or none up top) */}
      {photos.length > (takesBookings ? 0 : 1) && (
        <Section tight className="border-t border-line">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle eyebrow={t.photosEyebrow} title={f(t.photosTitle)} />
            <p className="max-w-sm text-[15px] text-ink/65">{t.photosHint}</p>
          </div>
          <Reveal className="mt-8">
            <ServicePhotoGrid images={photos} />
          </Reveal>
        </Section>
      )}

      {/* 4. FAQ + enquiry form (the booking page already has the booking card at the top, so it
          gets the FAQ beside the help card instead of a second form) */}
      <Section tight id="enquire" className="scroll-mt-20 border-t border-line">
        <div className={`grid grid-cols-1 gap-10 lg:gap-14 ${takesBookings ? "lg:grid-cols-[1.25fr_0.75fr]" : "lg:grid-cols-2"}`}>
          <div>
            <SectionTitle eyebrow={t.faqEyebrow} title={f(t.faqTitle)} />
            <div className="mt-8">
              <Faq items={s.faqs} />
            </div>
            {!takesBookings && helpCard}
          </div>
          {takesBookings ? (
            <div className="lg:sticky lg:top-28 lg:self-start">
              {helpCard}
              <ButtonLink href="#book" variant="secondary" full className="mt-4" arrow="right">
                {book.title}
              </ButtonLink>
            </div>
          ) : (
            <Reveal className="surface-card rounded-[2rem] p-6 sm:p-9">
              <h2 className="type-h3 text-navy">{t.requestTitle}</h2>
              <p className="mt-2 text-[15px] text-ink/65">{t.requestText}</p>
              <ContactForm topics={["service"]} services={[s.name, ...others.map((o) => o.name)]} defaultSubject={s.name} text={form} submitLabel={t.requestSubmit} bare className="mt-8" />
            </Reveal>
          )}
        </div>
      </Section>

      {/* 5. Other services */}
      <Section tight className="border-t border-line">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionTitle eyebrow={t.moreEyebrow} title={t.moreTitle} />
          <ButtonLink href="/services" variant="link" arrow="right">
            {t.allLabel}
          </ButtonLink>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {others.map((o, i) => {
            const OIcon = o.icon;
            const img = serviceCover(o);
            return (
              <Reveal as="li" key={o.slug} delay={i * 60}>
                <Link href={serviceHref(o)} className="group block">
                  <span className="relative block aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-paper">
                    {img && <Image src={img.src} alt="" fill sizes="(min-width: 1024px) 220px, 50vw" className="object-cover transition duration-500 group-hover:scale-105" />}
                    <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-accent shadow-sm">
                      <OIcon className="h-[18px] w-[18px]" aria-hidden />
                    </span>
                  </span>
                  <span className="mt-3 flex items-center justify-between gap-2 font-display text-[16px] font-semibold text-navy">
                    {o.name}
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink/40 transition group-hover:text-accent" aria-hidden />
                  </span>
                  <span className="mt-1 line-clamp-2 block text-[13.5px] leading-snug text-ink/65">{o.summary}</span>
                </Link>
              </Reveal>
            );
          })}
        </ul>
      </Section>
    </>
  );
}
