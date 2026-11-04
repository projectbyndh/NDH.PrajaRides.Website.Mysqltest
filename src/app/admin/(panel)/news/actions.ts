"use server";

import { invalidate } from "@/lib/invalidate";
import { refresh } from "next/cache";
import { sql } from "@/lib/db";
import { postFieldError, type PostKind } from "@/lib/post-format";
import { createPost, deletePost, POSTS_TAG, updatePost } from "@/lib/posts";
import { requireAdmin } from "@/lib/session";
import type { FieldErrors } from "@/lib/validation";

export type PostState = { saved?: { slug: string; published: boolean }; error?: string; fieldErrors?: FieldErrors };

const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function savePostAction(_prev: PostState, fd: FormData): Promise<PostState> {
  await requireAdmin();
  const errors: FieldErrors = {};
  for (const f of ["kind", "title", "excerpt", "body", "endsOn"]) {
    const e = postFieldError(f, s(fd, f));
    if (e) errors[f] = e;
  }
  const coverId = s(fd, "coverId");
  if (coverId && !isId(coverId)) errors.coverId = "Upload the cover photo again.";
  if (Object.keys(errors).length) return { error: "Please fix the highlighted fields.", fieldErrors: errors };

  const kind = s(fd, "kind") as PostKind;
  const input = {
    kind,
    title: s(fd, "title").replace(/\s+/g, " "),
    excerpt: s(fd, "excerpt").replace(/\s+/g, " "),
    body: s(fd, "body"),
    coverId: coverId || null,
    published: fd.get("published") === "on",
    endsOn: kind === "offer" ? s(fd, "endsOn") || null : null,
    topic: kind === "blog" ? s(fd, "topic").replace(/\s+/g, " ").slice(0, 30) || null : null,
  };

  const id = s(fd, "id");
  let slug: string | null;
  if (id) {
    if (!isId(id)) return { error: "This post no longer exists." };
    const q = await sql();
    const [old] = await q`SELECT cover_id FROM posts WHERE id = ${id}`;
    slug = await updatePost(id, input);
    // A replaced or removed cover isn't used anywhere else.
    if (old?.cover_id && old.cover_id !== input.coverId) await q`DELETE FROM photos WHERE id = ${old.cover_id} AND album = 'news'`;
  } else {
    slug = await createPost(input);
  }
  if (!slug) return { error: "This post no longer exists." };
  invalidate(POSTS_TAG);
  return { saved: { slug, published: input.published } };
}

export async function deletePostAction(id: string): Promise<void> {
  await requireAdmin();
  if (!isId(id)) return;
  await deletePost(id);
  invalidate(POSTS_TAG);
  refresh();
}
