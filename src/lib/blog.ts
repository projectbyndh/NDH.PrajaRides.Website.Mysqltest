import "server-only";
import { photoUrl } from "./media";
import { getPublishedPost, getPublishedPosts, type Post } from "./posts";

// The blog at /blog: posts of kind "blog", written in /admin/news like news and offers.
// The starter guides were moved into the database by `npm run seed:content`.

export type BlogCover = { src: string; alt: string; width?: number; height?: number; local: boolean };

export type BlogArticle = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  topic: string;
  cover: BlogCover | null;
  publishedAt: Date | null;
  readMinutes: number;
};

const readMinutes = (text: string) => Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));

function fromPost(p: Post): BlogArticle {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    body: p.body,
    topic: p.topic || "Blog",
    cover: p.coverId ? { src: photoUrl(p.coverId), alt: "", width: p.coverWidth ?? undefined, height: p.coverHeight ?? undefined, local: true } : null,
    publishedAt: p.publishedAt,
    readMinutes: readMinutes(`${p.excerpt} ${p.body}`),
  };
}

/** Published blog articles, newest first (written in admin → News, type "Blog"). */
export async function getBlogArticles(): Promise<{ articles: BlogArticle[] }> {
  const posts = (await getPublishedPosts()).filter((p) => p.kind === "blog");
  return { articles: posts.map(fromPost) };
}

export async function getBlogArticle(slug: string): Promise<BlogArticle | null> {
  const post = await getPublishedPost(slug);
  return post?.kind === "blog" ? fromPost(post) : null;
}
