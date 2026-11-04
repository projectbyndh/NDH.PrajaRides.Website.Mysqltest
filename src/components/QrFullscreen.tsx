"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { Maximize2, X } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { useHydrated } from "@/components/SubmitButton";
import { useIdentity } from "@/components/IdentityProvider";

/**
 * Button that shows a driver's QR as large as the screen allows, white on black edges, so a
 * rider can scan it straight off the driver's phone (no messaging app needed).
 */
export function QrFullscreenButton({
  link,
  driverId,
  className = "",
  text = "Show QR full screen",
  tone = "nepcab",
}: {
  link: string;
  driverId?: string | null;
  className?: string;
  text?: string;
  tone?: "nepcab" | "praja";
}) {
  const hydrated = useHydrated();
  const { company, city } = useIdentity();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Keep the screen awake while showing the code, where supported.
    let lock: { release: () => Promise<void> } | undefined;
    (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<typeof lock> } }).wakeLock
      ?.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lock?.release().catch(() => {});
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!hydrated}
        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60 ${className}`}
      >
        <Maximize2 className="h-4 w-4" /> {text}
      </button>
      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={driverId ? `QR code for driver ${driverId}` : "NepCab QR code"}
            onClick={() => setOpen(false)}
            className={`fixed inset-0 z-[60] flex flex-col items-center justify-center p-5 ${tone === "praja" ? "bg-gradient-to-br from-white via-mist to-[#c6d5f5]" : "bg-brand"}`}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <LogoMark className="h-11 w-11" />
              <div className="leading-tight">
                <p className="text-xl font-extrabold">NEPCAB</p>
                <p className="text-xs font-semibold text-ink/70">By {company}</p>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-2xl" style={{ width: "min(92vw, 70vh)" }}>
              <QRCodeSVG value={link} size={512} level="H" marginSize={2} className="aspect-square h-auto w-full" />
            </div>
            <p className="mt-5 text-center text-2xl font-extrabold">Scan to download the app</p>
            <p className="mt-1 text-sm font-semibold text-ink/70">Android & iPhone{driverId ? ` · Driver ${driverId}` : ""}</p>
            <p className="mt-3 text-center text-xs font-semibold text-ink/60">
              NepCab {city} · By {company}
            </p>
            <button onClick={() => setOpen(false)} className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-4 py-2 text-sm font-semibold" aria-label="Close">
              <X className="h-4 w-4" /> Tap anywhere to close
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
