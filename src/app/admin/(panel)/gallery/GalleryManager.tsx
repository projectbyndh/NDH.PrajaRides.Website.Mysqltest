"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2, UploadCloud } from "lucide-react";
import { control, FormAlert, Modal } from "@/components/admin/form";
import { btn, Card, CardHeader, EmptyState } from "@/components/admin/ui";
import { ALBUMS, photoUrl, type Photo } from "@/lib/media";
import { deletePhotoAction, reorderPhotosAction, updatePhotoAction } from "./actions";
import { uploadPhoto } from "./upload";
import { Select } from "@/components/Select";

function Uploader() {
  const input = useRef<HTMLInputElement>(null);
  const [album, setAlbum] = useState<string>(ALBUMS[0].value);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);

  async function upload(files: File[]) {
    if (!files.length || progress) return;
    setErrors([]);
    setProgress({ done: 0, total: files.length });
    const failed: string[] = [];
    // One at a time keeps memory low on phones and each request under the size limit.
    for (const [i, f] of files.entries()) {
      try {
        await uploadPhoto(f, album);
      } catch (err) {
        failed.push(`${f.name}: ${err instanceof Error ? err.message : "upload failed"}`);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setErrors(failed);
    setProgress(null);
    if (input.current) input.current.value = "";
  }

  return (
    <Card>
      <CardHeader title="Add photos" description="Photos are resized automatically. Use real photos of your vehicles, office, drivers and events." className="mb-4" />
      <div className="mb-4 max-w-xs">
        <label htmlFor="album" className="mb-1.5 block text-sm font-semibold">
          Album
        </label>
        <Select id="album" value={album} onChange={(e) => setAlbum(e.target.value)} className={control()}>
          {ALBUMS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>
      </div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(Array.from(e.dataTransfer.files));
        }}
        disabled={!!progress}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${
          drag ? "border-brand-dark bg-brand-light/40" : "border-ink/15 hover:border-ink/30 hover:bg-ink/[0.015]"
        }`}
      >
        {progress ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-ink/50" />
            <span className="font-semibold">
              Uploading {progress.done + 1 > progress.total ? progress.total : progress.done + 1} of {progress.total}…
            </span>
            <span className="h-1.5 w-48 overflow-hidden rounded-full bg-ink/10">
              <span className="block h-full bg-ink transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </span>
          </>
        ) : (
          <>
            <UploadCloud className="h-8 w-8 text-ink/40" />
            <span className="font-semibold">Tap to choose photos, or drop them here</span>
            <span className="text-sm text-ink/50">JPG, PNG or WebP · up to 20 at a time</span>
          </>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => upload(Array.from(e.target.files ?? []).slice(0, 20))}
      />
      {errors.length > 0 && (
        <div className="mt-4">
          <FormAlert>
            {errors.length === 1 ? "One photo wasn't uploaded:" : `${errors.length} photos weren't uploaded:`}
            <ul className="mt-1 list-disc pl-4 font-normal">
              {errors.map((er) => (
                <li key={er}>{er}</li>
              ))}
            </ul>
          </FormAlert>
        </div>
      )}
    </Card>
  );
}

type ServiceOption = { slug: string; name: string };

function PhotoCard({ photo, index, count, onMove, services }: { photo: Photo; index: number; count: number; onMove: (from: number, to: number) => void; services: ServiceOption[] }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const save = (fields: Parameters<typeof updatePhotoAction>[1]) => start(() => updatePhotoAction(photo.id, fields));
  return (
    <li className={`overflow-hidden rounded-2xl border border-ink/[0.08] bg-white shadow-sm transition ${pending ? "opacity-60" : ""}`}>
      <div className="relative aspect-[4/3] bg-ink/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl(photo.id, "thumb")} alt={photo.caption} className="h-full w-full object-cover" loading="lazy" />
        <button
          type="button"
          onClick={() => save({ featured: !photo.featured })}
          title={photo.featured ? "Featured on the home and About pages" : "Feature on the home and About pages"}
          aria-pressed={photo.featured}
          className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow ${photo.featured ? "bg-brand text-ink" : "bg-white/90 text-ink/60 hover:text-ink"}`}
        >
          <Star className={`h-3.5 w-3.5 ${photo.featured ? "fill-current" : ""}`} /> {photo.featured ? "Featured" : "Feature"}
        </button>
      </div>
      <div className="space-y-2 p-3">
        <input
          defaultValue={photo.caption}
          maxLength={140}
          placeholder="Add a caption"
          aria-label="Caption"
          onBlur={(e) => e.target.value.trim() !== photo.caption && save({ caption: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className={`${control()} py-2 text-sm`}
        />
        <Select
          value={photo.service ?? ""}
          onChange={(e) => save({ service: e.target.value })}
          aria-label="Show on a service page"
          className={`${control()} py-2 text-sm`}
        >
          <option value="">Not on a service page</option>
          {services.map((s) => (
            <option key={s.slug} value={s.slug}>
              Service page: {s.name}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-1">
          <Select value={photo.album} onChange={(e) => save({ album: e.target.value })} aria-label="Album" className={`${control()} min-w-0 flex-1 py-2 text-sm`}>
            {ALBUMS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
          <button type="button" onClick={() => onMove(index, index - 1)} disabled={index === 0} className="rounded-lg p-2 text-ink/45 hover:bg-ink/5 disabled:opacity-30" aria-label="Move earlier">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onMove(index, index + 1)} disabled={index === count - 1} className="rounded-lg p-2 text-ink/45 hover:bg-ink/5 disabled:opacity-30" aria-label="Move later">
            <ArrowRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setConfirm(true)} className="rounded-lg p-2 text-ink/45 hover:bg-pin/10 hover:text-pin" aria-label="Delete photo">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} label="Delete photo">
        <h2 className="text-lg font-bold">Delete this photo?</h2>
        <p className="mt-1 text-sm text-ink/60">It will be removed from the website straight away.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirm(false)} className={btn.secondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirm(false);
              start(() => deletePhotoAction(photo.id));
            }}
            className={`${btn.primary} bg-pin hover:bg-pin/90`}
          >
            Delete
          </button>
        </div>
      </Modal>
    </li>
  );
}

export function GalleryManager({ photos, services }: { photos: Photo[]; services: ServiceOption[] }) {
  const [order, setOrder] = useState(photos);
  const [, start] = useTransition();
  const [lastPhotos, setLastPhotos] = useState(photos);
  if (photos !== lastPhotos) {
    setLastPhotos(photos);
    setOrder(photos);
  }
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    const [p] = next.splice(from, 1);
    next.splice(to, 0, p);
    setOrder(next);
    start(() => reorderPhotosAction(next.map((x) => x.id)));
  };
  const featured = order.filter((p) => p.featured).length;

  return (
    <>
      <Uploader />
      <Card>
        <CardHeader
          title={`Photos (${order.length})`}
          description={`Shown in this order on the Gallery page. ${featured} featured on the home and About pages (up to 6 are used).`}
          className="mb-4"
        />
        {order.length === 0 ? (
          <EmptyState icon={ImagePlus} title="No photos yet">
            Upload a few photos above. The Gallery page and photo sections appear on the website once there are photos.
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {order.map((p, i) => (
              <PhotoCard key={p.id} photo={p} index={i} count={order.length} onMove={move} services={services} />
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
