"use client";

import { useSyncExternalStore } from "react";
import { DownloadButtons } from "@/app/download/DownloadButtons";
import { appStoreLink, DIRECT_DRIVER_ID, playStoreLink } from "@/lib/config";

const subscribe = () => () => {};
const detect = () => (/android/i.test(navigator.userAgent) ? "android" : /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "desktop");

/** Store buttons for the general (no driver) audience; taps are tracked as general store taps. */
export function PlatformButtons({ compact = false }: { compact?: boolean }) {
  const platform = useSyncExternalStore(subscribe, detect, () => "desktop" as const);
  return (
    <DownloadButtons
      driverId={DIRECT_DRIVER_ID}
      visitId={null}
      highlight={platform}
      playUrl={playStoreLink(DIRECT_DRIVER_ID)}
      appStoreUrl={appStoreLink(DIRECT_DRIVER_ID)}
      tone="praja"
      compact={compact}
    />
  );
}
