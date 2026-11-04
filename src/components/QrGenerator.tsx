"use client";

import { useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { AlertCircle, Check, Copy, Download, ExternalLink, ImageIcon, QrCode, Send, Share2 } from "lucide-react";
import { QrFullscreenButton } from "@/components/QrFullscreen";
import { useHydrated } from "@/components/SubmitButton";
import { normalizeDriverId } from "@/lib/config";
import { GENERAL_QR } from "@/lib/config";
import { useIdentity } from "@/components/IdentityProvider";
import { WhatsAppGlyph } from "@/components/StoreBadges";
import { driverWelcomeMessage, generalShareMessage } from "@/lib/messages";
import { whatsappError, whatsappNumber } from "@/lib/validation";
import { referralLink } from "@/lib/refcode";

type Props = {
  baseUrl: string;
  driverId: string;
  /** Omit to lock the ID (driver portal, driver detail page). */
  onDriverIdChange?: (id: string) => void;
  title?: string;
  /** Show "Share my link" (driver portal). */
  shareable?: boolean;
  /** Show "Send on WhatsApp" (admin). Pre-fills the driver's number and name when known. */
  whatsapp?: { phone?: string | null; name?: string | null };
  /** The driver's referral code; links and QR use it instead of the guessable ID. */
  code?: string | null;
  /** The driver's name: the link reads /ride/<first name>/<code>. */
  name?: string | null;
};

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  a.click();
}

/** Web Share with files: phones (and some desktops) can hand the PNG straight to WhatsApp. */
function canShareFiles(): boolean {
  try {
    const probe = new File([""], "probe.png", { type: "image/png" });
    return typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [probe] });
  } catch {
    return false;
  }
}

export function QrGenerator({ baseUrl, driverId, onDriverIdChange, title = "QR code generator", shareable = false, whatsapp, code, name }: Props) {
  const hydrated = useHydrated();
  const identity = useIdentity();
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  // Admin tool only: switch between a driver's QR and the general NepCab QR.
  const [general, setGeneral] = useState(false);

  const id = general ? "" : normalizeDriverId(driverId);
  const valid = general || (driverId.trim() !== "" && id !== "DIRECT");
  const path = general ? GENERAL_QR : encodeURIComponent(code ?? id);
  const link = general ? `${baseUrl}/r` : `${baseUrl}${referralLink({ id, refCode: code, name: name ?? whatsapp?.name })}`;
  const imageUrl = `/qr/${path}/image`;

  async function shareLink() {
    const text = `Download the NepCab app — rides around ${identity.city}:`;
    if (navigator.share) await navigator.share({ title: "NepCab", text, url: link }).catch(() => {});
    else await copyLink();
  }

  async function shareImage() {
    setSharing(true);
    try {
      const blob = await (await fetch(imageUrl)).blob();
      const file = new File([blob], general ? "nepcab-qr.png" : `nepcab-qr-${id}.png`, { type: "image/png" });
      await navigator.share({ files: [file], text: `Scan to download the NepCab app: ${link}` }).catch(() => {});
    } finally {
      setSharing(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-ink/[0.08] bg-white p-5 shadow-[0_1px_2px_rgba(31,33,36,0.04)] sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light/70">
          <QrCode className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-bold leading-tight">{title}</h2>
          <p className="text-xs text-ink/50">One code works on Android and iPhone</p>
        </div>
      </div>

      {onDriverIdChange && (
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-ink/[0.05] p-1" role="tablist" aria-label="QR type">
          {([
            [false, "Driver QR"],
            [true, "General QR"],
          ] as const).map(([g, label]) => (
            <button
              key={label}
              role="tab"
              aria-selected={general === g}
              onClick={() => setGeneral(g)}
              className={`rounded-lg py-1.5 text-sm font-semibold transition ${general === g ? "bg-white text-ink shadow-sm" : "text-ink/55 hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {onDriverIdChange && general && (
        <p className="mb-4 rounded-xl bg-brand-light/50 px-3 py-2.5 text-xs text-ink/70">
          NepCab QR without a driver: for posters, the office, social media or anyone to share. Scans count as general visits.
        </p>
      )}

      {onDriverIdChange && !general && (
        <>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="qr-driver">
            Driver ID
          </label>
          <input
            id="qr-driver"
            value={driverId}
            onChange={(e) => onDriverIdChange(e.target.value.toUpperCase())}
            placeholder="e.g. DRV101"
            maxLength={32}
            className="mb-4 w-full rounded-xl border border-ink/15 bg-white px-3.5 py-2.5 font-semibold uppercase tracking-wide shadow-sm outline-none focus:border-brand-dark focus:ring-4 focus:ring-brand/25"
          />
        </>
      )}

      <div className="flex flex-col items-center rounded-2xl bg-brand p-4">
        <div className="w-full max-w-[300px] rounded-2xl bg-white p-3 shadow-md">
          {valid ? (
            <QRCodeSVG value={link} size={300} level="H" marginSize={1} className="aspect-square h-auto w-full" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center text-center text-sm text-ink/50">Enter a driver ID</div>
          )}
        </div>
        <p className="mt-3 text-sm font-bold">{general ? baseUrl.replace(/^https?:\/\//, "") : valid ? `Driver: ${id}` : " "}</p>
      </div>

      {valid && (
        <>
          <button onClick={copyLink} className="mt-3 flex w-full items-center gap-2 rounded-xl bg-ink/5 px-3 py-2 text-left text-xs text-ink/70 hover:bg-ink/10" title="Copy referral link">
            <span className="flex-1 truncate font-mono">{link}</span>
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </button>

          {shareable && <QrFullscreenButton link={link} driverId={id} className="mt-3 bg-brand text-ink" />}
          {shareable && (
            <button onClick={shareLink} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700">
              <Share2 className="h-4 w-4" /> Share my link (WhatsApp, Viber…)
            </button>
          )}

          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <a href={`${imageUrl}?download=1`} download className="flex items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-sm font-semibold text-white hover:bg-ink/90">
              <Download className="h-4 w-4" /> Download sticker PNG
            </a>
            <button onClick={() => qrRef.current && downloadCanvas(qrRef.current, general ? "nepcab-qr-plain.png" : `nepcab-qr-${id}-plain.png`)} title="QR code only, no branding" className="rounded-xl border border-ink/15 px-3 text-sm font-medium hover:bg-ink/5">
              QR only
            </button>
          </div>
          {hydrated && canShareFiles() && (
            <button onClick={shareImage} disabled={sharing} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-ink/15 py-2.5 text-sm font-semibold hover:bg-ink/5 disabled:opacity-60">
              <ImageIcon className="h-4 w-4" /> {sharing ? "Preparing…" : "Share sticker image…"}
            </button>
          )}

          {whatsapp &&
            (general ? (
              <WhatsAppSender key="general" id="general" initialMessage={generalShareMessage(baseUrl, identity)} subtitle="NepCab QR and download link" />
            ) : (
              <WhatsAppSender
                key={`${id}|${code ?? ""}|${whatsapp.phone ?? ""}`}
                id={id}
                phone={whatsapp.phone}
                initialMessage={driverWelcomeMessage({ baseUrl, driverId: id, name: whatsapp.name, phone: whatsapp.phone, code }, identity)}
                subtitle="Portal login, QR and referral link in one message"
              />
            ))}

          {/* Hi-res source for the "QR only" download */}
          <QRCodeCanvas ref={qrRef} value={link} size={1000} level="H" marginSize={2} className="hidden" />
        </>
      )}
    </div>
  );
}

function WhatsAppSender({ id, phone, initialMessage, subtitle }: { id: string; phone?: string | null; initialMessage: string; subtitle: string }) {
  const [number, setNumber] = useState(phone ?? "");
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState<string | null>(null);

  function send() {
    const msg = whatsappError(number);
    setError(msg);
    if (msg) return;
    const url = `https://wa.me/${whatsappNumber(number)}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mt-5 border-t border-ink/[0.08] pt-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#25d366]/15 text-[#128c7e]">
          <WhatsAppGlyph className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-bold">Send on WhatsApp</h3>
          <p className="text-[11px] text-ink/50">{subtitle}</p>
        </div>
      </div>

      <label htmlFor={`wa-${id}`} className="mb-1.5 block text-xs font-semibold text-ink/60">
        WhatsApp number
      </label>
      <div
        className={`flex items-center rounded-xl border bg-white shadow-sm focus-within:ring-4 ${
          error ? "border-pin/60 focus-within:ring-pin/15" : "border-ink/15 focus-within:border-brand-dark focus-within:ring-brand/25"
        }`}
      >
        {!/^\s*(\+|00)/.test(number) && <span className="border-r border-ink/10 px-3 text-sm font-semibold text-ink/50">+977</span>}
        <input
          id={`wa-${id}`}
          value={number}
          onChange={(e) => {
            setNumber(e.target.value);
            if (error) setError(whatsappError(e.target.value));
          }}
          onBlur={() => number && setError(whatsappError(number))}
          onKeyDown={(e) => e.key === "Enter" && send()}
          inputMode="tel"
          placeholder="98XXXXXXXX"
          aria-invalid={!!error}
          className="w-full bg-transparent px-3 py-2.5 text-sm outline-none"
        />
      </div>
      {error ? (
        <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-pin">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-ink/45">Other countries: type the full number with + (e.g. +91…).</p>
      )}

      <label htmlFor={`wa-msg-${id}`} className="mb-1.5 mt-3 block text-xs font-semibold text-ink/60">
        Message
      </label>
      <textarea
        id={`wa-msg-${id}`}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={7}
        className="w-full resize-y rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-xs leading-relaxed shadow-sm outline-none focus:border-brand-dark focus:ring-4 focus:ring-brand/25"
      />

      <button onClick={send} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25d366] py-2.5 text-sm font-bold text-[#073b2a] shadow-sm transition hover:bg-[#20bd5a] active:scale-[0.99]">
        <Send className="h-4 w-4" /> Open WhatsApp chat
      </button>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-ink/45">
        <ExternalLink className="mt-px h-3 w-3 shrink-0" />
        Opens WhatsApp with the message ready. Press send there. The QR link shows the sticker as a preview in the chat.
      </p>
    </div>
  );
}
