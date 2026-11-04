"use client";

import { useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useHydrated } from "@/components/SubmitButton";
import { resizeForUpload } from "@/lib/resize-image";
import { replaceSiteImageAction } from "./actions";

/** One website image: a preview and a "Replace" button (resized in the browser, then uploaded). */
export function SlotCard({ slot, label, alt, version, stored }: { slot: string; label: string; alt: string; version: number | null; stored: boolean }) {
  const hydrated = useHydrated();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function replace(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { full, thumb, width, height } = await resizeForUpload(file);
      const fd = new FormData();
      fd.set("slot", slot);
      fd.set("full", full, "full");
      fd.set("thumb", thumb, "thumb");
      fd.set("width", String(width));
      fd.set("height", String(height));
      const res = await replaceSiteImageAction(fd);
      if (!res.ok) setError(res.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload this image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-ink/5">
        {stored ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/site/${slot}?s=thumb&v=${version}`} alt={alt} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-ink/45">No image yet</div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <Loader2 className="h-6 w-6 animate-spin text-ink/60" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{label}</p>
          <p className="truncate text-xs text-ink/45">{slot}</p>
        </div>
        <button
          type="button"
          disabled={!hydrated || busy}
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-ink ring-1 ring-ink/15 transition hover:bg-ink/5 disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" /> Replace
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            replace(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="px-3 pb-3 text-xs font-medium text-pin">{error}</p>}
    </li>
  );
}
