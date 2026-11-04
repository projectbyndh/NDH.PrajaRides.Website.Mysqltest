import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sql } from "./db";
import type { PostKind } from "./post-format";

// News and offers shown at /news, managed in /admin/news.

export type Post = {
  id: string;
  slug: string;
  kind: PostKind;
  title: string;
  excerpt: string;
  body: string;
  coverId: string | null;
  coverWidth: number | null;
  coverHeight: number | null;
  published: boolean;
  publishedAt: Date | null;
  endsOn: string | null;
  /** Blog articles: short topic for the card, e.g. "Guides". */
  topic: string | null;
  updatedAt: Date;
};

export type PostInput = { kind: PostKind; title: string; excerpt: string; body: string; coverId: string | null; published: boolean; endsOn: string | null; topic: string | null };

export const POSTS_TAG = "posts";

const COLUMNS = `p.id, p.slug, p.kind, p.title, p.excerpt, p.body, p.cover_id AS "coverId", ph.width AS "coverWidth", ph.height AS "coverHeight",
  p.published, p.published_at AS "publishedAt", to_char(p.ends_on, 'YYYY-MM-DD') AS "endsOn", p.topic, p.updated_at AS "updatedAt"`;
const FROM = `FROM posts p LEFT JOIN photos ph ON ph.id = p.cover_id`;

/** Published posts, newest first (cached until the admin edits a post). */
export async function getPublishedPosts(): Promise<Post[]> {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("hours");
  try {
    const q = await sql();
    const rows = await q.unsafe(`SELECT ${COLUMNS} ${FROM} WHERE p.published ORDER BY p.published_at DESC LIMIT 100`);
    return rows as unknown as Post[];
  } catch (err) {
    console.error("[posts] unavailable:", err);
    return [];
  }
}

export async function getPublishedPost(slug: string): Promise<Post | null> {
  "use cache";
  cacheTag(POSTS_TAG);
  cacheLife("hours");
  try {
    const q = await sql();
    const [row] = await q.unsafe(`SELECT ${COLUMNS} ${FROM} WHERE p.published AND p.slug = $1`, [slug]);
    return (row as unknown as Post) ?? null;
  } catch (err) {
    console.error("[posts] unavailable:", err);
    return null;
  }
}

export async function listAllPosts(): Promise<Post[]> {
  const q = await sql();
  const rows = await q.unsafe(`SELECT ${COLUMNS} ${FROM} ORDER BY p.published, COALESCE(p.published_at, p.created_at) DESC`);
  return rows as unknown as Post[];
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 70)
    .replace(/-+$/, "");
  return base || "post";
}

async function uniqueSlug(title: string, exceptId?: string): Promise<string> {
  const q = await sql();
  const base = slugify(title);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const [taken] = exceptId ? await q`SELECT 1 FROM posts WHERE slug = ${slug} AND id <> ${exceptId}` : await q`SELECT 1 FROM posts WHERE slug = ${slug}`;
    if (!taken) return slug;
  }
}

const row = (p: PostInput) => ({ kind: p.kind, title: p.title, excerpt: p.excerpt, body: p.body, cover_id: p.coverId, published: p.published, ends_on: p.endsOn, topic: p.topic });

export async function createPost(p: PostInput): Promise<string> {
  const q = await sql();
  const slug = await uniqueSlug(p.title);
  const [r] = await q`INSERT INTO posts ${q({ ...row(p), slug, published_at: p.published ? new Date() : null })} RETURNING slug`;
  return r.slug as string;
}

/** Updates a post. The link (slug) stays the same once published, so shared links keep working. */
export async function updatePost(id: string, p: PostInput): Promise<string | null> {
  const q = await sql();
  const [current] = await q`SELECT slug, published, published_at FROM posts WHERE id = ${id}`;
  if (!current) return null;
  const slug = current.published_at ? (current.slug as string) : await uniqueSlug(p.title, id);
  const publishedAt = p.published ? (current.published_at ?? new Date()) : current.published_at;
  await q`UPDATE posts SET ${q({ ...row(p), slug, published_at: publishedAt, updated_at: new Date() })} WHERE id = ${id}`;
  return slug;
}

export async function deletePost(id: string): Promise<void> {
  const q = await sql();
  const [p] = await q`DELETE FROM posts WHERE id = ${id} RETURNING cover_id`;
  // Covers live only on their post.
  if (p?.cover_id) await q`DELETE FROM photos WHERE id = ${p.cover_id} AND album = 'news'`;
}
