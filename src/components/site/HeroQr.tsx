"use client";

import { useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";

const subscribe = () => () => {};

/** General NepCab QR (via /r, so scans are counted as general visits). */
export function HeroQr({ className = "mx-auto mt-6 w-full max-w-[220px] rounded-3xl p-3 shadow-lg" }: { className?: string }) {
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => null);
  return (
    <div className={`aspect-square bg-white ${className}`}>
      {origin && <QRCodeSVG value={`${origin}/r`} size={220} level="M" marginSize={1} className="h-full w-full" />}
    </div>
  );
}
