import Link from "next/link";
import { ArrowUpRight, BookOpen, CalendarClock, Megaphone, Newspaper } from "lucide-react";
import { photoUrl } from "@/lib/media";
import { postHref } from "@/lib/post-format";
import type { Post } from "@/lib/posts";

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kathmandu" });
export const formatDay = (d: Date | string) => day.format(new Date(d));

export function KindTag({ kind, dark = false }: { kind: Post["kind"]; dark?: boolean }) {
  const Icon = kind === "offer" ? Megaphone : kind === "blog" ? BookOpen : Newspaper;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display type-eyebrow ${
        kind === "offer" ? "bg-accent text-navy" : dark ? "bg-white/10 text-white/80" : "bg-navy/[0.06] text-navy/70"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {kind === "offer" ? "Offer" : kind === "blog" ? "Blog" : "News"}
    </span>
  );
}

/** Card for a news post or offer. `large` is the lead story on /news. */
export function PostCard({ post, large = false }: { post: Post; large?: boolean }) {
  return (
    <Link
      href={postHref(post)}
      className={`group flex h-full overflow-hidden rounded-[1.75rem] bg-white ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-navy/5 ${large ? "flex-col md:flex-row" : "flex-col"}`}
    >
      <div className={`relative overflow-hidden bg-navy ${large ? "aspect-[16/10] md:aspect-auto md:w-[55%]" : "aspect-[16/10]"}`}>
        {post.coverId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl(post.coverId, large ? "full" : "thumb")}
            alt=""
            loading={large ? "eager" : "lazy"}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="bg-navy-grain flex h-full min-h-40 items-center justify-center">
            {post.kind === "offer" ? <Megaphone className="h-10 w-10 text-accent/60" /> : <Newspaper className="h-10 w-10 text-accent/60" />}
          </div>
        )}
        <div className="absolute left-4 top-4">
          <KindTag kind={post.kind} dark />
        </div>
      </div>
      <div className={`flex flex-1 flex-col ${large ? "p-7 sm:p-10" : "p-6"}`}>
        {post.publishedAt && <p className="text-sm text-ink/65">{formatDay(post.publishedAt)}</p>}
        <h3 className={`mt-2 font-bold leading-snug text-navy ${large ? "text-xl sm:text-2xl" : "text-lg"}`}>{post.title}</h3>
        <p className={`mt-3 text-ink/65 ${large ? "text-[17px] leading-relaxed" : "line-clamp-3 text-[15px]"}`}>{post.excerpt}</p>
        {post.endsOn && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-deep">
            <CalendarClock className="h-4 w-4" /> Valid until {formatDay(post.endsOn)}
          </p>
        )}
        <span className="mt-auto inline-flex items-center gap-1 pt-6 text-sm font-bold text-navy">
          Read more <ArrowUpRight className="h-4 w-4 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
