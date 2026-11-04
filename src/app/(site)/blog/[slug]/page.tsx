import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { FacebookGlyph, WhatsAppGlyph } from "@/components/StoreBadges";
import { LogoMark } from "@/components/Logo";
import { BlogCard, BlogMeta, CoverImage } from "@/components/site/BlogCard";
import { ButtonLink } from "@/components/site/Button";
import { Reveal } from "@/components/site/motion";
import { PlatformButtons } from "@/components/site/PlatformButtons";
import { Section } from "@/components/site/ui";
import { getBlogArticle, getBlogArticles } from "@/lib/blog";
import { getBlock } from "@/lib/content/store";
import { parseBody } from "@/lib/post-format";
import { getSiteContent } from "@/lib/site-content";
import { SITE_ORIGIN } from "@/lib/site-url";

// Blog article: title and summary; a wide cover with the topic, reading time and date right under
// it; the article beside a sticky panel (share links, NepCab app, call us); then more articles.
// Everything sits on one 5xl column so the left edges line up.

type Props = PageProps<"/blog/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getBlogArticle((await params).slug);
  if (!a) return { title: "Blog" };
  const images = a.cover ? [{ url: a.cover.src, width: a.cover.width, height: a.cover.height }] : undefined;
  return {
    title: a.title,
    description: a.excerpt,
    openGraph: { title: a.title, description: a.excerpt, type: "article", publishedTime: a.publishedAt?.toISOString(), images },
    twitter: { card: images ? "summary_large_image" : "summary" },
  };
}

export default function BlogArticlePage({ params }: Props) {
  return (
    <Suspense fallback={<div className="bg-hero-light h-[420px]" />}>
      <Article params={params} />
    </Suspense>
  );
}

async function Article({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const [article, { articles }, { contact }, t] = await Promise.all([getBlogArticle(slug), getBlogArticles(), getSiteContent(), getBlock("listings.article")]);
  if (!article) notFound();
  const more = articles.filter((a) => a.slug !== article.slug).slice(0, 3);
  const blocks = parseBody(article.body);
  const url = `${SITE_ORIGIN}/blog/${article.slug}`;
  const share = [
    { label: "Share on WhatsApp", icon: WhatsAppGlyph, href: `https://wa.me/?text=${encodeURIComponent(`${article.title} ${url}`)}` },
    { label: "Share on Facebook", icon: FacebookGlyph, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  ];

  return (
    <article>
      <header className="bg-hero-light relative isolate overflow-hidden px-4 pb-8 pt-6 sm:px-6 sm:pb-12 sm:pt-12">
        <div className="bg-grid-ink pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto max-w-5xl">
          <h1 className="type-h1 animate-fade-up max-w-3xl text-navy">{article.title}</h1>
          <p className="type-lead animate-fade-up delay-200 mt-4 max-w-2xl text-ink/70 sm:mt-5">{article.excerpt}</p>
          {!article.cover && <BlogMeta article={article} className="animate-fade-up delay-300 mt-6" />}
        </div>
      </header>

      {article.cover && (
        <div className="px-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <Reveal className="relative aspect-[16/10] overflow-hidden rounded-[1.25rem] bg-paper shadow-[var(--shadow-soft)] sm:aspect-[16/9] sm:rounded-[2rem] lg:aspect-[21/9]">
              <CoverImage cover={article.cover} sizes="(min-width: 1024px) 1024px, 100vw" priority />
            </Reveal>
            {/* Topic, reading time and date, right under the photo */}
            <BlogMeta article={article} className="mt-4 border-b border-line pb-4 sm:mt-5 sm:pb-5" />
          </div>
        </div>
      )}

      <Section className="!pt-8 sm:!pt-12">
        <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1fr_17rem] lg:gap-16">
          {/* Article text */}
          <div className="min-w-0 max-w-[44rem] space-y-5 text-[16px] leading-[1.8] text-ink/80 sm:text-[17px] sm:leading-[1.85]">
            {blocks.map((b, i) =>
              b.type === "h" ? (
                <h2 key={i} className="type-h3 pt-5 text-navy">
                  {b.text}
                </h2>
              ) : b.type === "ul" ? (
                <ul key={i} className="space-y-2.5">
                  {b.items.map((it, j) => (
                    <li key={j} className="flex gap-3">
                      <span className="mt-[0.75em] h-1.5 w-1.5 shrink-0 rotate-45 bg-accent" aria-hidden />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p key={i}>{b.text}</p>
              ),
            )}
          </div>

          {/* Side panel */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="surface-card rounded-[1.5rem] p-5">
              <p className="type-eyebrow text-ink/65">{t.shareTitle}</p>
              <div className="mt-4 flex gap-2">
                {share.map(({ label, icon: Icon, href }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-navy ring-1 ring-line transition hover:bg-navy hover:text-white hover:ring-navy"
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </a>
                ))}
              </div>
            </div>
            <div className="bg-accent-gradient rounded-[1.5rem] p-5 text-navy">
              <p className="type-eyebrow flex items-center gap-2 text-navy/75">
                <LogoMark className="h-5 w-5" /> {t.appEyebrow}
              </p>
              <p className="mt-3 font-display text-lg font-bold leading-snug">{t.appTitle}</p>
              <div className="mt-4">
                <PlatformButtons compact />
              </div>
            </div>
            <div className="surface-card rounded-[1.5rem] p-5">
              <p className="font-display font-semibold text-navy">{t.helpTitle}</p>
              <p className="mt-1 text-[14px] text-ink/65">{t.helpText}</p>
              <ButtonLink href={`tel:${contact.phone}`} variant="outline" size="sm" icon={Phone} className="mt-4">
                {contact.phone}
              </ButtonLink>
            </div>
          </aside>
        </div>
      </Section>

      {more.length > 0 && (
        <Section className="border-t border-line">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="type-h2 text-navy">{t.moreTitle}</h2>
            <ButtonLink href="/blog" variant="outline" arrow="right">
              {t.moreButton}
            </ButtonLink>
          </div>
          <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {more.map((a, i) => (
              <Reveal as="li" key={a.slug} delay={i * 90}>
                <BlogCard article={a} />
              </Reveal>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}
