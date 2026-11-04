import { Suspense } from "react";
import { BadgeCheck, MapPin, Phone } from "lucide-react";
import { appStoreLink, normalizeDriverId, playStoreLink } from "@/lib/config";
import { DynamicIcon } from "@/components/DynamicIcon";
import { LogoMark } from "@/components/Logo";
import { FacebookGlyph, TikTokGlyph } from "@/components/StoreBadges";
import { getBlock } from "@/lib/content/store";
import type { ShareText } from "@/lib/content/pages/nepcab";
import { resolveReferral, type Referral } from "@/lib/drivers";
import { getSiteContent } from "@/lib/site-content";
import { referralLink } from "@/lib/refcode";
import { DownloadButtons } from "./DownloadButtons";
import { ShareQr } from "./DesktopQr";

// Text comes from admin → Page content → NepCab app; phone numbers and social links from admin → Website.
type PageText = Awaited<ReturnType<typeof getBlock<"download.page">>>;

export default async function DownloadPage(props: PageProps<"/download">) {
  const [c, share, { contact, social }] = await Promise.all([getBlock("download.page"), getBlock("download.share"), getSiteContent()]);
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-brand">
      {/* Decorative road curve */}
      <svg className="pointer-events-none absolute -right-24 top-40 h-[520px] w-[520px] opacity-25" viewBox="0 0 200 200" aria-hidden>
        <path d="M10 190 C 60 120, 140 140, 190 10" stroke="#fff" strokeWidth="18" fill="none" strokeLinecap="round" />
        <path d="M10 190 C 60 120, 140 140, 190 10" stroke="#1f2124" strokeWidth="1.5" strokeDasharray="6 6" fill="none" />
      </svg>

      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-8 pt-10">
        <header className="flex flex-col items-center text-center">
          <LogoMark className="h-24 w-24 drop-shadow-md" />
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight">NEPCAB</h1>
          <p className="font-deva text-xl font-bold">
            {c.tagline}
            <span className="mx-auto mt-0.5 block h-0.5 w-20 rounded-full bg-pin" />
          </p>
          <p className="mt-2 flex items-center gap-1 text-sm font-medium text-ink/75">
            <MapPin className="h-4 w-4" /> {c.byLine}
          </p>
        </header>

        <section className="mt-7 rounded-3xl bg-white p-5 shadow-2xl shadow-brand-dark/40">
          <Suspense fallback={<CardSkeleton />}>
            <DownloadCard searchParams={props.searchParams} text={c} share={share} />
          </Suspense>
        </section>

        <ul className="mt-6 grid grid-cols-3 gap-2 text-center text-xs font-medium">
          {c.badges.map(({ icon, label }) => (
            <li key={label} className="rounded-2xl bg-white/45 px-2 py-3 backdrop-blur">
              <DynamicIcon name={icon} className="mx-auto mb-1 h-5 w-5" />
              {label}
            </li>
          ))}
        </ul>

        <footer className="mt-auto pt-8 text-center text-sm text-ink/80">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <a href={`https://wa.me/977${contact.phone}`} className="inline-flex items-center gap-1 font-semibold">
              <Phone className="h-4 w-4" /> {contact.phone}
            </a>
            <a href={`tel:${contact.tollFree}`} className="inline-flex items-center gap-1 font-semibold">
              Toll free {contact.tollFree}
            </a>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <a
              href={social.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white active:scale-95"
            >
              <TikTokGlyph className="h-4 w-4" /> TikTok
            </a>
            <a
              href={social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1877f2] px-4 py-2 text-sm font-semibold text-white active:scale-95"
            >
              <FacebookGlyph className="h-4 w-4" /> Facebook
            </a>
          </div>
          <p className="mt-2 text-xs text-ink/65">{c.followText}</p>
        </footer>
      </div>
    </main>
  );
}

async function DownloadCard({ searchParams, text: c, share }: { searchParams: PageProps<"/download">["searchParams"]; text: PageText; share: ShareText }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

  // ?ref= carries a referral code (or a legacy driver ID); ?driver= is the older format.
  const raw = one(sp.ref) ?? one(sp.driver);
  const ref: Referral = await resolveReferral(raw).catch(() => ({ driverId: normalizeDriverId(raw), driver: null }));
  const { driverId, driver } = ref;
  const p = one(sp.p);
  const highlight = p === "android" || p === "ios" ? p : "desktop";
  const visitId = one(sp.v);
  const referred = driverId !== "DIRECT";
  const driverName = driver?.active ? driver.name : null;
  // What visitors share from this page: the driver's code (keeps their credit), or the plain site.
  const sharePath = referred ? (driver ? referralLink(driver) : `/r/${encodeURIComponent(driverId)}`) : "/";

  return (
    <>
      {referred && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-brand-light/60 px-4 py-3">
          <BadgeCheck className="h-5 w-5 shrink-0 text-ink" />
          <p className="text-sm">
            {c.referredLabel} <span className="font-bold">{driverName ?? driverId}</span>
            {driverName && <span className="ml-1.5 text-xs text-ink/55">{driverId}</span>}
          </p>
        </div>
      )}
      <h2 className="text-xl font-bold">{c.title}</h2>
      <p className="mb-5 mt-1 text-sm text-ink/70">{c.text}</p>

      <DownloadButtons
        driverId={driverId}
        visitId={visitId}
        highlight={highlight}
        playUrl={playStoreLink(driverId)}
        appStoreUrl={appStoreLink(driverId)}
      />

      <ShareQr path={sharePath} label={referred ? driverId : null} isDesktop={highlight === "desktop"} text={share} />
    </>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-6 w-2/3 rounded bg-ink/10" />
      <div className="h-4 w-full rounded bg-ink/10" />
      <div className="h-16 rounded-2xl bg-ink/10" />
      <div className="h-16 rounded-2xl bg-ink/10" />
    </div>
  );
}
