import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { BRAND } from "@/lib/config";
import { HeroQr } from "./HeroQr";

/** A phone frame whose screen shows the NepCab QR (general link, tracked). */
export function PhoneMockup({ caption = "Scan to download NepCab" }: { caption?: string }) {
  return (
    <div className="relative mx-auto w-[17rem]">
      <div className="relative rounded-[2.8rem] bg-[#000b24] p-3 shadow-[0_20px_40px_-24px_rgb(2_10_31/0.5)] ring-1 ring-white/10">
        <div className="absolute left-1/2 top-3 z-10 h-6 w-24 -translate-x-1/2 rounded-b-2xl bg-[#000b24]" />
        <div className="overflow-hidden rounded-[2.2rem] bg-gradient-to-b from-white to-mist px-5 pb-7 pt-10 text-ink">
          <div className="flex items-center gap-2.5 font-sans">
            <LogoMark className="h-10 w-10" />
            <div className="leading-tight">
              <p className="text-lg font-extrabold">NEPCAB</p>
              <p className="font-deva text-sm font-bold">{BRAND.tagline}</p>
            </div>
          </div>
          <HeroQr />
          <p className="mt-4 text-center text-sm font-semibold">{caption}</p>
          <p className="mt-0.5 text-center text-xs text-ink/65">Android &amp; iPhone</p>
        </div>
      </div>
    </div>
  );
}

/** Company fact sheet: label/value rows on a dark card. */
export function FactSheet({ title, rows }: { title: string; rows: { label: string; value: ReactNode }[] }) {
  return (
    <div className="bg-navy-grain rounded-3xl p-7 text-white ring-1 ring-accent/20 sm:p-8">
      <p className="type-eyebrow text-accent">{title}</p>
      <dl className="mt-5 divide-y divide-white/10">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-[8.5rem_1fr] gap-4 py-3.5 text-[15px]">
            <dt className="text-white/50">{r.label}</dt>
            <dd className="font-semibold text-white/90">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
