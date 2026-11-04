"use client";

import { useState, useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Share2 } from "lucide-react";
import { QrFullscreenButton } from "@/components/QrFullscreen";
import { BRAND } from "@/lib/config";
import type { ShareText } from "@/lib/content/pages/nepcab";

const subscribe = () => () => {};

// Used until the page passes the text set in admin → Page content → NepCab app.
const DEFAULT_TEXT: ShareText = {
  desktopTitle: "On a computer? Scan with your phone",
  desktopText: "Point your phone camera at the code to install the app.",
  title: "Share NepCab with a friend",
  text: "Let them scan this QR, or send them the link.",
  shareLabel: "Share link",
  fullscreenLabel: "Full screen",
  shareMessage: `Download the NepCab app — rides around ${BRAND.city}:`,
  footer: `NepCab ${BRAND.city} · By ${BRAND.company}`,
};

/**
 * "Share NepCab" card shown to every visitor: QR + link, so anyone (not just drivers) can pass
 * the app on. When the visitor came through a driver's link, the shared link keeps that driver's code.
 */
export function ShareQr({ path, label, isDesktop, tone = "nepcab", text: t = DEFAULT_TEXT }: { path: string; label: string | null; isDesktop: boolean; tone?: "nepcab" | "praja"; text?: ShareText }) {
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => null);
  const [copied, setCopied] = useState(false);
  if (!origin) return null;
  const link = `${origin}${path}`;
  const pretty = link.replace(/^https?:\/\//, "");

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  async function share() {
    if (navigator.share) await navigator.share({ title: "NepCab", text: t.shareMessage, url: link }).catch(() => {});
    else await copy();
  }

  return (
    <div className="mt-5 rounded-2xl border border-dashed border-ink/20 p-4">
      <p className="text-sm font-bold">{isDesktop ? t.desktopTitle : t.title}</p>
      <p className="text-xs text-ink/55">{isDesktop ? t.desktopText : t.text}</p>

      <div className="mx-auto mt-3 w-full max-w-[220px] rounded-2xl bg-white p-2.5 ring-1 ring-ink/10">
        <QRCodeSVG value={link} size={220} level="M" marginSize={2} className="aspect-square h-auto w-full" />
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-ink/[0.04] py-1.5 pl-3 pr-1.5">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink/70">{pretty}</span>
        <button onClick={copy} className="rounded-lg p-2 text-ink/60 hover:bg-white hover:text-ink" aria-label="Copy link">
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button onClick={share} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
          <Share2 className="h-4 w-4" /> {t.shareLabel}
        </button>
        <QrFullscreenButton link={link} driverId={label} text={t.fullscreenLabel} tone={tone} className="py-2.5 text-sm" />
      </div>
      <p className="mt-3 text-center text-[11px] font-semibold text-ink/50">
        {t.footer}
      </p>
    </div>
  );
}
