import Image from "next/image";
import { LOGO } from "@/lib/site-images";

// Praja Ride Pvt. Ltd. brand (parent company). NepCab is its ride service in Butwal.
//
// The emblem is the built-in file, not the logo slot in object storage. It is on the header and the
// footer of every page, so reading it from storage cost two requests per page view - each one a
// database lookup, a storage read and a 1024px source resized down to a 56px mark - and on shared
// hosting that is a request budget better spent on the page itself. The 192px copy is already the
// right size for both places. The logo slot (admin → Website images → Brand) still feeds the press
// page and the data search engines read; to put it back here, use LOGO.src below again.
const BRAND_LOGO = "/brand/praja-ride-logo-192.png";
const BRAND_LOGO_PX = 192;

type MarkProps = { className?: string; title?: string; priority?: boolean };

export function PrajaMark({ className = "h-10 w-10", title = "Praja Ride Pvt. Ltd.", priority = false }: MarkProps) {
  return (
    <Image
      src={BRAND_LOGO}
      alt={title}
      width={BRAND_LOGO_PX}
      height={BRAND_LOGO_PX}
      preload={priority}
      sizes="(min-width: 640px) 112px, 80px"
      className={`shrink-0 rounded-full object-cover shadow-[0_2px_10px_rgba(0,0,0,0.35)] ring-1 ring-accent/40 ${className}`}
    />
  );
}

/**
 * The emblem on its own (it already reads "Praja Ride Pvt. Ltd."), in a thin gold rim with a soft
 * glow. Lifts slightly when its link (a parent with `group`) is hovered.
 */
export function PrajaEmblem({ className = "h-12 w-12", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full bg-gradient-to-br from-[#ffe2a3] via-accent to-[#a85f00] p-[2px] shadow-[0_8px_22px_-8px_rgba(255,167,0,0.6)] transition duration-300 ease-out group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_-8px_rgba(255,167,0,0.75)] ${className}`}
    >
      <Image
        src={BRAND_LOGO}
        alt={LOGO.alt}
        width={BRAND_LOGO_PX}
        height={BRAND_LOGO_PX}
        preload={priority}
        sizes="64px"
        className="h-full w-full rounded-full object-cover"
      />
    </span>
  );
}

export function PrajaWordmark({ className = "", light = false, sub, priority = false }: { className?: string; light?: boolean; sub?: string; priority?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <PrajaMark className="h-11 w-11" priority={priority} />
      <div className="min-w-0 leading-none">
        <div className={`font-display text-[17px] font-extrabold uppercase tracking-[0.04em] ${light ? "text-white" : "text-navy"}`}>
          Praja <span className="text-accent">Ride</span>
        </div>
        <div className={`mt-1 truncate font-display text-[10px] font-bold uppercase tracking-[0.16em] ${light ? "text-white/60" : "text-ink/60"}`}>{sub ?? "Pvt. Ltd."}</div>
      </div>
    </div>
  );
}
