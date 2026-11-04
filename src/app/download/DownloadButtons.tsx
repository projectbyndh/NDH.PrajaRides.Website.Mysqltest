"use client";

import { ChevronRight } from "lucide-react";
import { AppleGlyph, PlayGlyph } from "@/components/StoreBadges";

type Store = "play" | "appstore";

type Props = {
  driverId: string;
  visitId: string | null;
  highlight: "android" | "ios" | "desktop";
  playUrl: string;
  appStoreUrl: string;
};

function track(driverId: string, visitId: string | null, store: Store) {
  const payload = JSON.stringify({ driverId, visitId, store });
  // sendBeacon is queued by the browser and survives the navigation to the store.
  if (navigator.sendBeacon?.("/api/track-click", new Blob([payload], { type: "text/plain" }))) return;
  void fetch("/api/track-click", { method: "POST", body: payload, keepalive: true }).catch(() => {});
}

export function DownloadButtons({
  driverId,
  visitId,
  highlight,
  playUrl,
  appStoreUrl,
  tone = "nepcab",
  compact = false,
}: Props & { tone?: "nepcab" | "praja"; /** Smaller buttons side by side (e.g. inside a hero card). */ compact?: boolean }) {
  const buttons = [
    {
      store: "play" as const,
      href: playUrl,
      top: "GET IT ON",
      label: "Google Play",
      glyph: <PlayGlyph className={compact ? "h-7 w-7" : "h-8 w-8"} />,
      primary: highlight === "android",
    },
    {
      store: "appstore" as const,
      href: appStoreUrl,
      top: "Download on the",
      label: "App Store",
      glyph: <AppleGlyph className={compact ? "h-7 w-7" : "h-8 w-8"} />,
      primary: highlight === "ios",
    },
  ];
  // Put the rider's own platform first.
  if (highlight === "ios") buttons.reverse();

  return (
    <div className={compact ? "flex flex-wrap gap-2.5" : "flex flex-col gap-3"}>
      {buttons.map((b) => (
        <a
          key={b.store}
          href={b.href}
          onClick={() => track(driverId, visitId, b.store)}
          className={[
            "group relative flex items-center transition duration-200 active:scale-[0.98]",
            compact
              ? "h-14 min-w-[10.5rem] gap-3 rounded-xl bg-gradient-to-b from-[#1f2937] to-ink px-4 text-white shadow-[0_8px_20px_-10px_rgb(2_10_31/0.6)] ring-1 ring-inset ring-white/10 hover:-translate-y-0.5 hover:from-navy hover:to-navy hover:shadow-[0_14px_28px_-12px_rgb(2_10_31/0.7)]"
              : "gap-4 rounded-2xl px-5 py-4",
            compact
              ? ""
              : b.primary
              ? `bg-ink text-white shadow-xl shadow-ink/25 ring-4 ${tone === "praja" ? "ring-accent/45" : "ring-brand/60"}`
              : highlight === "desktop"
                ? "bg-ink text-white shadow-lg shadow-ink/20"
                : "border-2 border-ink/15 bg-white text-ink",
          ].join(" ")}
        >
          <span className={!compact && b.store === "appstore" && !b.primary && highlight !== "desktop" ? "text-ink" : ""}>
            {b.glyph}
          </span>
          <span className="flex flex-col leading-tight">
            <span className={compact ? "text-[10.5px] font-medium uppercase tracking-wide opacity-75" : "text-xs font-medium opacity-80"}>{b.top}</span>
            <span className={compact ? "font-display text-[17px] font-bold tracking-tight" : "text-xl font-semibold"}>{b.label}</span>
          </span>
          {!compact && <ChevronRight className="ml-auto h-5 w-5 opacity-60 transition group-hover:translate-x-0.5" />}
          {b.primary && !compact && (
            <span className={`absolute -top-2.5 right-4 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone === "praja" ? "bg-accent text-navy" : "bg-pin text-navy"}`}>
              For your phone
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
