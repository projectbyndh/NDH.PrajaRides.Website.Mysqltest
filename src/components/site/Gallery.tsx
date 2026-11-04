"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useHydrated } from "@/components/SubmitButton";
import { albumLabel, ALBUMS, photoUrl, type Photo } from "@/lib/media";

/** Full-screen photo viewer: arrows / swipe to browse, Escape or the backdrop to close. */
function Lightbox({ photos, index, onClose, onIndex }: { photos: Photo[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const touch = useRef<number | null>(null);
  const go = useCallback((d: number) => onIndex((index + d + photos.length) % photos.length), [index, photos.length, onIndex]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [go, onClose]);
  const p = photos[index];
  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex flex-col bg-navy/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3 text-white/70 sm:px-6">
        <span className="font-display text-sm font-semibold">
          {index + 1} / {photos.length}
        </span>
        <button onClick={onClose} className="ml-auto rounded-full p-2 hover:bg-white/10 hover:text-white" aria-label="Close">
          <X className="h-6 w-6" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16" onClick={(e) => e.target === e.currentTarget && onClose()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={p.id} src={photoUrl(p.id)} alt={p.caption || albumLabel(p.album)} width={p.width} height={p.height} className="animate-fade-in max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
        {photos.length > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-2 hidden rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:block" aria-label="Previous photo">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button onClick={() => go(1)} className="absolute right-2 hidden rounded-full bg-white/10 p-3 text-white hover:bg-white/20 sm:block" aria-label="Next photo">
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
      <div className="px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 text-center sm:px-6">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent">{albumLabel(p.album)}</p>
        {p.caption && <p className="mx-auto mt-1 max-w-2xl text-[15px] text-white/80">{p.caption}</p>}
      </div>
    </div>,
    document.body,
  );
}

function Tile({ photo, onOpen, className = "" }: { photo: Photo; onOpen: () => void; className?: string }) {
  return (
    <button type="button" onClick={onOpen} className={`group relative block w-full overflow-hidden rounded-2xl bg-ink/5 ring-1 ring-line ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl(photo.id, "thumb")}
        alt={photo.caption || albumLabel(photo.album)}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-navy/75 via-navy/0 to-navy/0 opacity-0 transition duration-300 group-hover:opacity-100" />
      {photo.caption && (
        <span className="absolute inset-x-0 bottom-0 translate-y-2 p-4 text-left text-sm font-semibold text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          {photo.caption}
        </span>
      )}
    </button>
  );
}

/** Filterable masonry gallery (the /gallery page). */
export function Gallery({ photos }: { photos: Photo[] }) {
  const hydrated = useHydrated();
  const [album, setAlbum] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const albums = ALBUMS.filter((a) => photos.some((p) => p.album === a.value));
  const shown = album ? photos.filter((p) => p.album === album) : photos;

  return (
    <>
      {albums.length > 1 && (
        <div className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Albums">
          {[{ value: null, label: "All photos" }, ...albums].map((a) => {
            const on = album === a.value;
            return (
              <button
                key={a.label}
                role="tab"
                aria-selected={on}
                onClick={() => setAlbum(a.value)}
                className={`shrink-0 rounded-full px-4 py-2 font-display text-sm font-semibold transition ${on ? "bg-navy text-white" : "bg-white text-ink/65 ring-1 ring-ink/10 hover:text-navy"}`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      )}
      <div className={`gap-3 sm:gap-4 [&>*]:mb-3 sm:[&>*]:mb-4 ${shown.length === 1 ? "mx-auto max-w-3xl" : shown.length <= 4 ? "columns-2" : "columns-2 lg:columns-3"}`}>
        {shown.map((p, i) => (
          <div key={p.id} className="break-inside-avoid">
            <Tile photo={p} onOpen={() => setOpen(i)} />
          </div>
        ))}
      </div>
      {hydrated && open !== null && shown[open] && <Lightbox photos={shown} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />}
    </>
  );
}

/** Up to six photos in an editorial grid (home and About pages). */
export function PhotoMosaic({ photos }: { photos: Photo[] }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState<number | null>(null);
  const list = photos.slice(0, 6);
  // Big first tile, then smaller ones; adapts to how many photos there are.
  const spans = ["col-span-2 row-span-2", "", "", "", "", ""];
  return (
    <>
      <div className="grid auto-rows-[9rem] grid-cols-2 gap-3 sm:auto-rows-[11rem] sm:gap-4 md:grid-cols-4">
        {list.map((p, i) => (
          <Tile key={p.id} photo={p} onOpen={() => setOpen(i)} className={`h-full ${list.length > 2 ? spans[i] : "col-span-2 row-span-2"}`} />
        ))}
      </div>
      {hydrated && open !== null && <Lightbox photos={list} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />}
    </>
  );
}
