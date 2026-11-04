import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import type { BlogArticle, BlogCover } from "@/lib/blog";
import { formatDay } from "./PostCard";

/** Cover photo that fills its box, resized for the space it fills (uploaded and placeholder photos alike). */
export function CoverImage({ cover, sizes, priority = false, className = "" }: { cover: BlogCover; sizes: string; priority?: boolean; className?: string }) {
  return <Image src={cover.src} alt={cover.alt} fill sizes={sizes} preload={priority} loading={priority ? "eager" : undefined} className={`object-cover ${className}`} />;
}

/** Topic · read time · date (date only for published posts). */
export function BlogMeta({ article, className = "" }: { article: BlogArticle; className?: string }) {
  return (
    <p className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink/65 ${className}`}>
      <span className="font-display font-semibold uppercase tracking-[0.12em] text-accent-deep">{article.topic}</span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" aria-hidden /> {article.readMinutes} min read
      </span>
      {article.publishedAt && <span>{formatDay(article.publishedAt)}</span>}
    </p>
  );
}

/** Card for a blog article. `large` lays the lead article out side by side on /blog. */
export function BlogCard({ article, large = false }: { article: BlogArticle; large?: boolean }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className={`surface-card group flex h-full overflow-hidden rounded-[1.5rem] transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[var(--shadow-lift)] ${
        large ? "flex-col md:flex-row" : "flex-col"
      }`}
    >
      <div className={`relative overflow-hidden bg-paper ${large ? "aspect-[16/10] md:aspect-auto md:min-h-[22rem] md:w-[55%]" : "aspect-[16/10]"}`}>
        {article.cover ? (
          <CoverImage
            cover={article.cover}
            sizes={large ? "(min-width: 768px) 620px, 100vw" : "(min-width: 1024px) 360px, (min-width: 768px) 50vw, 100vw"}
            priority={large}
            className="transition duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full min-h-40 items-center justify-center">
            <BookOpen className="h-10 w-10 text-accent/60" aria-hidden />
          </div>
        )}
      </div>
      <div className={`flex flex-1 flex-col ${large ? "p-7 sm:p-10" : "p-6"}`}>
        <BlogMeta article={article} />
        <h3 className={`mt-3 font-display font-bold leading-snug text-navy ${large ? "text-2xl sm:text-[1.75rem]" : "text-lg"}`}>{article.title}</h3>
        <p className={`mt-3 text-ink/65 ${large ? "text-[16.5px] leading-relaxed" : "line-clamp-3 text-[15px] leading-relaxed"}`}>{article.excerpt}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-6 font-display text-[14.5px] font-semibold text-navy transition group-hover:text-accent-deep">
          Read article <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
