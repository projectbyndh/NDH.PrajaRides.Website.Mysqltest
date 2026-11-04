"use client";

import { useEffect, useState } from "react";
import { Phone, PhoneCall, X } from "lucide-react";
import { WhatsAppGlyph } from "@/components/StoreBadges";
import { bookingWhatsAppUrl } from "./booking";

type Labels = { openLabel: string; whatsapp: string; call: string; tollFree: string };

/** Always-reachable help: a floating button that opens call / WhatsApp / toll-free shortcuts. */
export function FloatingContact({ phone, tollFree, labels }: { phone: string; tollFree: string; labels: Labels }) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 240);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const actions = [
    { href: bookingWhatsAppUrl(phone), label: labels.whatsapp, sub: phone, icon: WhatsAppGlyph, tone: "bg-[#25d366] text-white", external: true },
    { href: `tel:${phone}`, label: labels.call, sub: phone, icon: Phone, tone: "bg-accent-soft text-accent" },
    { href: `tel:${tollFree}`, label: labels.tollFree, sub: tollFree, icon: PhoneCall, tone: "bg-mist text-accent-deep" },
  ];

  return (
    <div
      className={`fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end gap-3 transition duration-500 sm:right-6 ${
        shown || open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      {open && (
        <ul id="quick-contact" className="animate-fade-up w-60 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-navy/20 ring-1 ring-ink/10">
          {actions.map(({ href, label, sub, icon: Icon, tone, external }) => (
            <li key={label}>
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 transition hover:bg-paper"
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm font-bold text-navy">{label}</span>
                  <span className="block text-xs text-ink/65">{sub}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="quick-contact"
        aria-label={open ? "Close contact options" : labels.openLabel}
        className={`relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_8px_20px_-6px_rgb(7_94_84/0.55)] ring-4 ring-white transition hover:scale-105 ${
          open ? "bg-navy" : "bg-[#25d366] hover:bg-[#1ebe5b]"
        }`}
      >
        {open ? <X className="h-6 w-6" /> : <WhatsAppGlyph className="h-7 w-7" />}
      </button>
    </div>
  );
}
