import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getServices } from "@/lib/services";
import { serviceCover, serviceHref, withIcon, type ServiceWithIcon } from "./brand-services";
import { FeatureCarousel } from "./FeatureCarousel";
import { Reveal } from "./motion";
import { Rail } from "./Rail";

// Every Praja Ride service as cards. Same card language everywhere (home, /services, related
// links), so each service reads as part of one brand: photo, icon, tag, name, one line.

function ArrowChip({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition duration-300 group-hover:rotate-45 ${
        dark ? "bg-accent text-navy" : "bg-paper text-navy ring-1 ring-line group-hover:bg-accent group-hover:ring-accent"
      }`}
      aria-hidden
    >
      <ArrowUpRight className="h-4.5 w-4.5" />
    </span>
  );
}

/** `wide`: on tablets (2 columns) this card fills a row on its own, laid out side by side. */
export function ServiceCard({ service, delay = 0, wide = false }: { service: ServiceWithIcon; delay?: number; wide?: boolean }) {
  const { icon: Icon, name, tag, summary, poweredBy } = service;
  const photo = serviceCover(service);
  return (
    <Reveal as="li" from="zoom" delay={delay} className={wide ? "sm:col-span-2 lg:col-span-1" : ""}>
      <Link
        href={serviceHref(service)}
        className={`surface-card group flex h-full flex-col overflow-hidden rounded-[1.75rem] p-2 ${wide ? "sm:flex-row lg:flex-col" : ""} transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[var(--shadow-lift)]`}
      >
        {/* Framed photo with the service icon and tag on top */}
        <div className={`relative aspect-[16/10] overflow-hidden rounded-[1.35rem] bg-paper ${wide ? "sm:aspect-auto sm:min-h-52 sm:w-1/2 lg:aspect-[16/10] lg:min-h-0 lg:w-auto" : ""}`}>
          {photo && (
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-700 group-hover:scale-[1.04]"
            />
          )}
          <span className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-accent shadow-sm transition duration-300 group-hover:bg-accent group-hover:text-navy">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="type-eyebrow absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1.5 !text-[11px] text-navy shadow-sm">{tag}</span>
        </div>
        <div className={`flex flex-1 flex-col px-4 pb-4 pt-5 ${wide ? "sm:justify-center sm:px-6" : ""}`}>
          <h3 className="type-h3 text-navy">{name}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink/65">{summary}</p>
          <span className="mt-auto flex items-end justify-between gap-3 pt-6">
            <span className="text-xs font-medium text-ink/65">{poweredBy ? `Powered by ${poweredBy.name}` : "Praja Ride"}</span>
            <ArrowChip />
          </span>
        </div>
      </Link>
    </Reveal>
  );
}

/**
 * Bento layout (home): a large card cycling through every service, with the other services around it.
 * `exclude` drops one service and switches to a plain grid (e.g. "More services" on a service page).
 */
export async function ServiceGrid({ exclude }: { exclude?: string }) {
  const services = await getServices();
  if (exclude) {
    const list = services.filter((s) => s.slug !== exclude).map(withIcon);
    return (
      <Rail className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((s, i) => (
          <ServiceCard key={s.slug} service={s} delay={(i % 3) * 70} />
        ))}
      </Rail>
    );
  }
  const [, ...rest] = services.map(withIcon);
  return (
    <Rail className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <FeatureCarousel services={services} />
      {rest.map((s, i) => (
        <ServiceCard key={s.slug} service={s} delay={(i % 3) * 70} wide={rest.length % 2 === 1 && i === rest.length - 1} />
      ))}
    </Rail>
  );
}
