import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Download, Printer, Smartphone } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { QrFullscreenButton } from "@/components/QrFullscreen";
import { getIdentity } from "@/lib/identity";
import { siteUrl } from "@/lib/site";
import { GENERAL_QR } from "@/lib/config";
import { resolveReferral } from "@/lib/drivers";
import { referralLink, referralPath } from "@/lib/refcode";

// Public page for a driver's QR sticker. Shared on WhatsApp: the link preview shows the QR.
// It doesn't track anything (scans are only counted on /r/...).

type Props = PageProps<"/qr/[driverId]">;

type Target = { id: string | null; path: string; rLink: string };

/** /qr/general is the NepCab QR without a driver; anything else is a referral code or legacy ID. */
async function target(params: Props["params"]): Promise<Target | null> {
  const segment = decodeURIComponent((await params).driverId);
  if (segment.toLowerCase() === GENERAL_QR) return { id: null, path: GENERAL_QR, rLink: "/r" };
  const { driverId, driver } = await resolveReferral(segment);
  if (driverId === "DIRECT") return null;
  const path = driver ? referralPath(driver) : encodeURIComponent(driverId);
  return { id: driverId, path, rLink: driver ? referralLink(driver) : `/r/${path}` };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await target(params);
  const id = t?.id;
  const path = t?.path ?? GENERAL_QR;
  const title = id ? `NepCab QR · Driver ${id}` : "NepCab QR · Download the app";
  const { city } = await getIdentity();
  const description = `Scan to download the NepCab app — rides around ${city}. Works on Android and iPhone.`;
  const image = { url: `/qr/${path}/image?variant=og`, width: 1200, height: 630, alt: id ? `NepCab QR code for driver ${id}` : "NepCab QR code" };
  return { title, description, openGraph: { title, description, images: [image], type: "website" }, twitter: { card: "summary_large_image", images: [image.url] } };
}

export default async function QrPage(props: Props) {
  const who = await getIdentity();
  return (
    <main className="flex flex-1 flex-col items-center bg-brand px-4 py-8">
      <div className="flex items-center gap-2.5">
        <LogoMark className="h-10 w-10" />
        <span className="text-xl font-extrabold">NEPCAB</span>
      </div>
      <Suspense fallback={<div className="mt-6 aspect-[1200/1760] w-full max-w-sm animate-pulse rounded-3xl bg-white/50" />}>
        <Sticker params={props.params} />
      </Suspense>
      <p className="mt-6 text-center text-xs text-ink/65">
        {who.city} · {who.company}
      </p>
    </main>
  );
}

async function Sticker({ params }: { params: Props["params"] }) {
  const t = await target(params);
  if (!t) notFound();
  const { id, path, rLink } = t;
  const src = `/qr/${path}/image`;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={id ? `NepCab QR sticker for driver ${id}` : "NepCab QR sticker"} width={1200} height={1760} className="mt-6 h-auto w-full max-w-sm rounded-3xl shadow-2xl shadow-brand-dark/40" />
      <div className="mt-6 w-full max-w-sm">
        <QrFullscreenButton link={`${await siteUrl()}${rLink}`} driverId={id} className="rounded-2xl py-3.5" />
      </div>
      <a href={`${src}?download=1`} download className="mt-3 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl border-2 border-ink/80 py-3 font-semibold text-ink">
        <Download className="h-5 w-5" /> Download sticker
      </a>
      <ul className="mt-5 w-full max-w-sm space-y-2 rounded-2xl bg-white/60 p-4 text-sm text-ink/80">
        <li className="flex gap-2">
          <Printer className="mt-0.5 h-4 w-4 shrink-0" /> Print at least 7 cm wide on matte paper and stick it where riders can see it.
        </li>
        <li className="flex gap-2">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" /> One code works on Android and iPhone. Riders just point their camera at it.
        </li>
      </ul>
    </>
  );
}
