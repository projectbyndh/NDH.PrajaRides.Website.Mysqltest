import type { BlockData } from "@/lib/content/blocks";
import type { SiteContent } from "@/lib/site-content";
import { SITE_ORIGIN } from "@/lib/site-url";
import { serviceHref } from "./brand-services";
import type { ServiceLink } from "./nav";

/**
 * schema.org data for Google (business name, address, phone, area served), so searches like
 * "NepCab Butwal" or "Praja Ride" can show the business details.
 */
export function StructuredData({ content, services, business: b }: { content: SiteContent; services: ServiceLink[]; business: BlockData<"site.business"> }) {
  const { contact, social, about, company } = content;
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_ORIGIN}/#business`,
    name: company.name,
    alternateName: b.otherNames,
    description: b.description,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Praja Ride services",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.label, description: s.summary, url: `${SITE_ORIGIN}${serviceHref(s)}` },
      })),
    },
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/media/site/logo`,
    image: `${SITE_ORIGIN}/media/site/logo`,
    telephone: `+977${contact.phone}`,
    ...(contact.email ? { email: contact.email } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: b.street,
      addressLocality: company.city,
      addressRegion: b.region,
      addressCountry: "NP",
    },
    areaServed: b.cities.map((name) => ({ "@type": "City", name })),
    ...(about.founded && /^\d{4}$/.test(about.founded) ? { foundingDate: about.founded } : {}),
    sameAs: [social.facebook, social.tiktok, social.instagram, social.google].filter(Boolean),
    contactPoint: [
      { "@type": "ContactPoint", telephone: `+977${contact.phone}`, contactType: "customer support", areaServed: "NP", availableLanguage: ["Nepali", "English"] },
      { "@type": "ContactPoint", telephone: contact.tollFree, contactType: "customer support", contactOption: "TollFree", areaServed: "NP" },
    ],
  };
  // Escape "<" so the JSON can't close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
