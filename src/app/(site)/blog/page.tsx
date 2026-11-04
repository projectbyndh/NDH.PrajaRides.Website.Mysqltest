import type { Metadata } from "next";
import { BlogCard } from "@/components/site/BlogCard";
import { Reveal } from "@/components/site/motion";
import { PageHero, Section } from "@/components/site/ui";
import { getBlogArticles } from "@/lib/blog";
import { getBlock } from "@/lib/content/store";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getBlock("listings.blog");
  return { title: c.seoTitle, description: c.seoDescription };
}

// Blog list: the newest article as a large lead card, the rest in a grid.
export default async function BlogPage() {
  const [{ articles }, c] = await Promise.all([getBlogArticles(), getBlock("listings.blog")]);
  const [lead, ...rest] = articles;

  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} intro={c.intro} />
      <Section>
        {lead && (
          <Reveal>
            <BlogCard article={lead} large />
          </Reveal>
        )}
        {rest.length > 0 && (
          <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((a, i) => (
              <Reveal as="li" key={a.slug} delay={(i % 3) * 90}>
                <BlogCard article={a} />
              </Reveal>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
