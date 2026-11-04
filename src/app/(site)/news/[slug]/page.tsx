import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { AnimatedText } from "@/components/site/AnimatedText";
import { Reveal } from "@/components/site/motion";
import { formatDay, KindTag, PostCard } from "@/components/site/PostCard";
import { Section } from "@/components/site/ui";
import { getBlock } from "@/lib/content/store";
import { photoUrl } from "@/lib/media";
import { parseBody } from "@/lib/post-format";
import { getPublishedPost, getPublishedPosts } from "@/lib/posts";

type Props = PageProps<"/news/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPost((await params).slug);
  if (!post) return { title: "News" };
  const images = post.coverId ? [{ url: photoUrl(post.coverId), width: post.coverWidth ?? undefined, height: post.coverHeight ?? undefined }] : undefined;
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: "article", publishedTime: post.publishedAt?.toISOString(), images },
    twitter: { card: images ? "summary_large_image" : "summary" },
  };
}

export default function ArticlePage({ params }: Props) {
  return (
    <Suspense fallback={<div className="bg-hero-light h-[420px]" />}>
      <Article params={params} />
    </Suspense>
  );
}

async function Article({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();
  if (post.kind === "blog") redirect(`/blog/${post.slug}`);
  const [all, t] = await Promise.all([getPublishedPosts(), getBlock("listings.news")]);
  const more = all.filter((p) => p.id !== post.id && p.kind !== "blog").slice(0, 3);
  const blocks = parseBody(post.body);

  return (
    <article>
      <header className="bg-hero-light relative overflow-hidden border-b border-line px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16">
        <div className="relative mx-auto max-w-3xl">
          <Link href="/news" className="animate-fade-up inline-flex items-center gap-1.5 text-sm font-semibold text-ink/65 hover:text-accent">
            <ArrowLeft className="h-4 w-4" /> {t.backLabel}
          </Link>
          <div className="animate-fade-up mt-6 flex flex-wrap items-center gap-3">
            <KindTag kind={post.kind} />
            {post.publishedAt && <span className="text-sm text-ink/65">{formatDay(post.publishedAt)}</span>}
          </div>
          <AnimatedText as="h1" immediate startDelay={120} lines={[post.title]} className="type-h1 mt-5 block text-navy" />
          <p className="type-lead animate-fade-up delay-200 mt-5 text-ink/70">{post.excerpt}</p>
          {post.endsOn && (
            <p className="animate-fade-up delay-300 mt-6 inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-2 text-sm font-semibold text-accent ring-1 ring-accent/30">
              <CalendarClock className="h-4 w-4" /> {t.validUntil} {formatDay(post.endsOn)}
            </p>
          )}
        </div>
      </header>

      <Section className="pt-0 sm:pt-0">
        <div className="mx-auto max-w-3xl">
          {post.coverId && (
            <Reveal className="-mt-1 overflow-hidden rounded-b-3xl sm:rounded-3xl sm:-mt-0 sm:translate-y-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(post.coverId)} alt="" width={post.coverWidth ?? undefined} height={post.coverHeight ?? undefined} className="w-full object-cover" />
            </Reveal>
          )}
          <div className={`space-y-5 text-[17px] leading-[1.85] text-ink/80 ${post.coverId ? "mt-12 sm:mt-20" : "mt-12"}`}>
            {blocks.map((b, i) =>
              b.type === "h" ? (
                <h2 key={i} className="type-h3 pt-4 text-navy">
                  {b.text}
                </h2>
              ) : b.type === "ul" ? (
                <ul key={i} className="space-y-2 pl-1">
                  {b.items.map((it, j) => (
                    <li key={j} className="flex gap-3">
                      <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p key={i}>{b.text}</p>
              ),
            )}
          </div>
        </div>
      </Section>

      {more.length > 0 && (
        <Section className="bg-white">
          <h2 className="type-h2 text-navy">{t.moreTitle}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {more.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </Section>
      )}
    </article>
  );
}
