"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarClock, ExternalLink, ImagePlus, Loader2, Megaphone, Newspaper, Pencil, Plus, Trash2, X } from "lucide-react";
import { Drawer, Field, FormAlert, Modal, useFormValidation } from "@/components/admin/form";
import { Badge, btn, Card, EmptyState } from "@/components/admin/ui";
import { useHydrated } from "@/components/SubmitButton";
import { photoUrl } from "@/lib/media";
import { postFieldError, postHref, POST_KINDS, type PostKind } from "@/lib/post-format";
import type { Post } from "@/lib/posts";
import { uploadPhoto } from "../gallery/upload";
import { deletePostAction, savePostAction, type PostState } from "./actions";

function KindIcon({ kind, className }: { kind: PostKind; className?: string }) {
  const Icon = kind === "offer" ? Megaphone : kind === "blog" ? BookOpen : Newspaper;
  return <Icon className={className} />;
}

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kathmandu" });
const todayNepal = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kathmandu" }).format(new Date());

function CoverPicker({ initial, error }: { initial: string | null; error?: string }) {
  const [id, setId] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="mb-1.5 flex items-baseline gap-1 text-sm font-semibold">
        Cover photo <span className="text-xs font-normal text-ink/40">Optional</span>
      </p>
      <input type="hidden" name="coverId" value={id ?? ""} />
      {id ? (
        <div className="relative overflow-hidden rounded-xl ring-1 ring-ink/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl(id, "thumb")} alt="" className="aspect-[16/9] w-full object-cover" />
          <button type="button" onClick={() => setId(null)} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white" aria-label="Remove cover">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/15 text-sm font-semibold text-ink/55 hover:border-ink/30"
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
          {busy ? "Uploading…" : "Choose a photo"}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setErr(null);
          try {
            setId(await uploadPhoto(f, "news"));
          } catch (er) {
            setErr(er instanceof Error ? er.message : "Upload failed");
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      {(err || error) && <p className="mt-1.5 text-[13px] font-medium text-pin">{err || error}</p>}
    </div>
  );
}

function PostForm({ post, onDone }: { post: Post | null; onDone: () => void }) {
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState<PostState, FormData>(savePostAction, {});
  const v = useFormValidation(postFieldError, state.fieldErrors);
  const [kind, setKind] = useState(post?.kind ?? "news");
  const e = v.errors;
  const common = { onBlur: v.onBlur, onChange: v.onChange };
  useEffect(() => {
    if (state.saved) onDone();
  }, [state.saved, onDone]);

  return (
    <form action={action} onSubmit={v.onSubmit} noValidate className="space-y-5">
      {state.error && <FormAlert>{state.error}</FormAlert>}
      {post && <input type="hidden" name="id" value={post.id} />}
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Type">
        {POST_KINDS.map((k) => (
          <label key={k.value} className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${kind === k.value ? "border-ink bg-ink text-white" : "border-ink/15 bg-white text-ink/70"}`}>
            <input type="radio" name="kind" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} className="sr-only" />
            <KindIcon kind={k.value} className="h-4 w-4" /> {k.label}
          </label>
        ))}
      </div>
      <Field label="Title" name="title" required error={e.title}>
        {(p) => <input {...p} {...common} defaultValue={post?.title} maxLength={120} placeholder={kind === "offer" ? "e.g. Rs 50 off your first ride this Dashain" : kind === "blog" ? "e.g. 5 tips for your first NepCab ride" : "e.g. NepCab now serving Bhairahawa"} />}
      </Field>
      {kind === "blog" && (
        <Field label="Topic" name="topic" hint="A word or two shown on the card, e.g. Guides, Safety, Drivers.">
          {(p) => <input {...p} defaultValue={post?.topic ?? ""} maxLength={30} placeholder="e.g. Guides" />}
        </Field>
      )}
      <Field label="Short summary" name="excerpt" required error={e.excerpt} hint="Shown on cards and in link previews.">
        {(p) => <textarea {...p} {...common} defaultValue={post?.excerpt} rows={2} maxLength={260} />}
      </Field>
      <CoverPicker initial={post?.coverId ?? null} error={e.coverId} />
      <Field label="Full article" name="body" error={e.body} hint="Blank line = new paragraph · start a line with “## ” for a heading, “- ” for a bullet.">
        {(p) => <textarea {...p} {...common} defaultValue={post?.body} rows={10} className={`${p.className} font-mono text-sm`} />}
      </Field>
      {kind === "offer" && (
        <Field label="Offer valid until" name="endsOn" error={e.endsOn} hint="Shown on the offer. Unpublish it once it ends.">
          {(p) => <input {...p} {...common} type="date" defaultValue={post?.endsOn ?? ""} />}
        </Field>
      )}
      <label className="flex items-start gap-3 rounded-xl border border-ink/10 bg-white p-4">
        <input type="checkbox" name="published" defaultChecked={post?.published ?? true} className="mt-0.5 h-4 w-4 accent-ink" />
        <span>
          <span className="block text-sm font-semibold">Published</span>
          <span className="text-sm text-ink/55">Visible on the website. Untick to keep it as a draft.</span>
        </span>
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onDone} className={`${btn.secondary} flex-1`}>
          Cancel
        </button>
        <button disabled={pending || !hydrated} className={`${btn.primary} flex-1`}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} {post ? "Save changes" : "Create"}
        </button>
      </div>
    </form>
  );
}

function PostRow({ post, onEdit }: { post: Post; onEdit: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const expired = post.kind === "offer" && post.endsOn && post.endsOn < todayNepal();
  return (
    <li className={`flex gap-4 p-4 sm:p-5 ${pending ? "opacity-50" : ""}`}>
      <div className="hidden h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-ink/5 sm:block">
        {post.coverId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl(post.coverId, "thumb")} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-ink/25"><KindIcon kind={post.kind} className="h-6 w-6" /></div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={post.kind === "offer" ? "brand" : "neutral"}>{POST_KINDS.find((k) => k.value === post.kind)?.label ?? "News"}</Badge>
          {post.published ? <Badge tone="green" dot>Published</Badge> : <Badge tone="amber" dot>Draft</Badge>}
          {expired && <Badge tone="red">Ended</Badge>}
        </div>
        <h3 className="mt-1.5 font-bold leading-snug">{post.title}</h3>
        <p className="mt-0.5 line-clamp-1 text-sm text-ink/55">{post.excerpt}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-ink/45">
          {post.publishedAt && <span>{day.format(new Date(post.publishedAt))}</span>}
          {post.endsOn && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock className="h-3.5 w-3.5" /> until {day.format(new Date(post.endsOn))}
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-start">
        {post.published && (
          <a href={postHref(post)} target="_blank" className="rounded-lg p-2 text-ink/45 hover:bg-ink/5 hover:text-ink" aria-label="View on website">
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <button type="button" onClick={onEdit} className="rounded-lg p-2 text-ink/45 hover:bg-ink/5 hover:text-ink" aria-label="Edit">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setConfirm(true)} className="rounded-lg p-2 text-ink/45 hover:bg-pin/10 hover:text-pin" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} label="Delete post">
        <h2 className="text-lg font-bold">Delete “{post.title}”?</h2>
        <p className="mt-1 text-sm text-ink/60">The post and its cover photo are removed permanently. Shared links will stop working.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setConfirm(false)} className={btn.secondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirm(false);
              start(() => deletePostAction(post.id));
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

export function NewsManager({ posts }: { posts: Post[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Post | "new" | null>(null);
  const close = () => {
    setEditing(null);
    router.refresh();
  };
  return (
    <>
      <div className="flex justify-end">
        <button type="button" onClick={() => setEditing("new")} className={btn.primary}>
          <Plus className="h-4 w-4" /> New post
        </button>
      </div>
      <Card flush>
        {posts.length === 0 ? (
          <EmptyState icon={Newspaper} title="No posts yet">
            Share launch news, offers and blog articles. News and offers appear on the News page, blog articles on the Blog.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-ink/[0.07]">
            {posts.map((p) => (
              <PostRow key={p.id} post={p} onEdit={() => setEditing(p)} />
            ))}
          </ul>
        )}
      </Card>
      <Drawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "New post" : "Edit post"}
        description="News and offers appear on the News page; blog articles on the Blog. Both show on the home page."
      >
        {editing !== null && <PostForm key={editing === "new" ? "new" : editing.id} post={editing === "new" ? null : editing} onDone={close} />}
      </Drawer>
    </>
  );
}
