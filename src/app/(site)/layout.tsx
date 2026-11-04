import Link from "next/link";
import { Megaphone } from "lucide-react";
import { FloatingContact } from "@/components/site/FloatingContact";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { StructuredData } from "@/components/site/StructuredData";
import { getBlock } from "@/lib/content/store";
import { getSiteContent } from "@/lib/site-content";
import { getServices } from "@/lib/services";
import { serviceNav } from "@/components/site/nav";

// Public Praja Ride website: brand typography (see globals.css type scale), editable
// announcement bar, shared header, closing call-to-action and footer.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [content, services, nav, footer, contactButton, business] = await Promise.all([
    getSiteContent(),
    getServices(),
    getBlock("site.nav"),
    getBlock("site.footer"),
    getBlock("site.contactButton"),
    getBlock("site.business"),
  ]);
  const serviceLinks = serviceNav(services);
  const { announcement } = content;
  return (
    <div
      className="theme-praja flex min-h-full flex-1 flex-col bg-white font-body text-[16px] leading-relaxed text-ink"
    >
      {/* Marks JS as running, so scroll-reveal may hide content until it animates in. */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      {announcement.enabled && announcement.text && (
        <div className="bg-accent-gradient px-4 py-2 text-center text-sm font-semibold text-navy">
          <Megaphone className="mr-1.5 inline h-4 w-4 -translate-y-px" />
          {announcement.link ? (
            <Link href={announcement.link} className="transition hover:opacity-80">
              {announcement.text}
            </Link>
          ) : (
            announcement.text
          )}
        </div>
      )}
      <a
        href="#main"
        className="sr-only z-[60] rounded-full bg-accent px-5 py-3 font-semibold text-navy shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      <SiteHeader phone={content.contact.phone} tollFree={content.contact.tollFree} services={serviceLinks} nav={nav} />
      <main id="main" tabIndex={-1} className="flex-1 overflow-x-clip outline-none">
        {children}
      </main>
      <SiteFooter content={content} services={serviceLinks} footer={footer} />
      <FloatingContact phone={content.contact.phone} tollFree={content.contact.tollFree} labels={contactButton} />
      <StructuredData content={content} services={serviceLinks} business={business} />
    </div>
  );
}
