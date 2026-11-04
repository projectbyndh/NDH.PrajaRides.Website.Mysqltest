import type { BlockData } from "@/lib/content/blocks";
import type { SiteImage } from "@/lib/site-images";
import { serviceCover, serviceHref, type ServiceData } from "./brand-services";

// Navigation for the public Praja Ride site (shared by header and footer). The menu links and
// labels are edited in admin → Page content → Every page; the services come from admin → Services.

export type NavContent = BlockData<"site.nav">;
export type FooterContent = BlockData<"site.footer">;

/** A service link for menus (plain data, so it can be passed to the browser). */
export type ServiceLink = { slug: string; href: string; label: string; summary: string; iconName: string; image: SiteImage | null };

/** Every service, for the header's Services menu and the footer (text from the database). */
export const serviceNav = (services: ServiceData[]): ServiceLink[] =>
  services.map((s) => ({ slug: s.slug, href: serviceHref(s), label: s.name, summary: s.summary, iconName: s.iconName, image: serviceCover(s) }));
