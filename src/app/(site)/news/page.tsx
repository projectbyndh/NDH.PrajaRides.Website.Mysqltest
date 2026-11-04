import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { Reveal } from "@/components/site/motion";
import { PostCard } from "@/components/site/PostCard";
import { PageHero, Section, SectionTitle } from "@/components/site/ui";
import { getBlock } from "@/lib/content/store";
import { getPublishedPosts } from "@/lib/posts";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getBlock("listings.news");
  return { title: c.seoTitle, description: c.seoDescription };
}

export default async function NewsPage() {
  const [all, c] = await Promise.all([getPublishedPosts(), getBlock("listings.news")]);
  const posts = all.filter((p) => p.kind !== "blog");
  const offers = posts.filter((p) => p.kind === "offer");
  const news = posts.filter((p) => p.kind === "news");
  const [lead, ...rest] = news;

  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} intro={c.intro} />
      {posts.length === 0 && (
        <Section>
          <Reveal className="mx-auto max-w-lg rounded-[1.75rem] bg-white p-10 text-center ring-1 ring-line">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Newspaper className="h-6 w-6" />
            </span>
            <h2 className="type-h3 mt-5 text-navy">{c.emptyTitle}</h2>
            <p className="mt-2 text-ink/65">{c.emptyText}</p>
          </Reveal>
        </Section>
      )}
      {offers.length > 0 && (
        <Section className={lead ? "pb-0 sm:pb-0" : ""}>
          <SectionTitle eyebrow={c.offersEyebrow} title={c.offersTitle} />
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 90}>
                <PostCard post={p} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}
      {lead && (
        <Section>
          <SectionTitle eyebrow={c.newsEyebrow} title={c.newsTitle} />
          <Reveal className="mt-10">
            <PostCard post={lead} large />
          </Reveal>
          {rest.length > 0 && (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 90}>
                  <PostCard post={p} />
                </Reveal>
              ))}
            </div>
          )}
        </Section>
      )}
    </>
  );
}
