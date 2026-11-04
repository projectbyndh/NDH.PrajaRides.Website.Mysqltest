import type { Metadata } from "next";
import { Reveal } from "@/components/site/motion";
import { Faq, Section, SectionTitle } from "@/components/site/ui";
import { Hero } from "@/components/site/home/Hero";
import { AudiencePaths, BookYourWay, DriveCta, HelpDesk, Services, WhoWeAre, WhyUs } from "@/components/site/home/sections";
import { getSiteContent } from "@/lib/site-content";
import { PhotoMosaic } from "@/components/site/Gallery";
import { PostCard } from "@/components/site/PostCard";
import { Testimonials } from "@/components/site/Testimonials";
import { pickFeatured } from "@/lib/media";
import { getGalleryPhotos } from "@/lib/photos";
import { getPublishedPosts } from "@/lib/posts";
import { getBlogArticles } from "@/lib/blog";
import { getBlock } from "@/lib/content/store";
import { BlogCard } from "@/components/site/BlogCard";
import { ButtonLink } from "@/components/site/Button";
import { Rail } from "@/components/site/Rail";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getBlock("home.seo");
  return { title: { absolute: seo.seoTitle }, description: seo.seoDescription };
}

// Page order follows what visitors come for: our services or driving (hero + paths), every Praja
// Ride service, how to book (app or offline), why trust us, driver recruitment, who we are, then proof and help.
export default async function HomePage() {
  const [content, photos, posts] = await Promise.all([getSiteContent(), getGalleryPhotos(), getPublishedPosts()]);
  const { contact, about } = content;
  const featured = pickFeatured(photos);
  const latest = posts.filter((p) => p.kind !== "blog").slice(0, 3);
  const [{ articles: blog }, titles] = await Promise.all([getBlogArticles(), getBlock("home.sections")]);

  return (
    <>
      <Hero />
      <WhoWeAre about={about} />
      <Services />
      <AudiencePaths />
      <BookYourWay contact={contact} />
      <WhyUs contact={contact} />
      <DriveCta />

      {/* ---------- Testimonials (admin → Website) ---------- */}
      {content.testimonials.length > 0 && <Testimonials items={content.testimonials} />}


      {/* ---------- Photos (admin → Gallery) ---------- */}
      {featured.length > 0 && (
        <Section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle eyebrow={titles.galleryEyebrow} title={titles.galleryTitle} />
            <Reveal>
              <ButtonLink href="/gallery" variant="outline" arrow="right">View gallery</ButtonLink>
            </Reveal>
          </div>
          <Reveal delay={100} className="mt-8 sm:mt-12">
            <PhotoMosaic photos={featured} />
          </Reveal>
        </Section>
      )}

      {/* ---------- Latest news (admin → News) ---------- */}
      {latest.length > 0 && (
        <Section className={featured.length > 0 ? "pt-0 sm:pt-0" : ""}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle eyebrow={titles.newsEyebrow} title={titles.newsTitle} />
            <Reveal>
              <ButtonLink href="/news" variant="outline" arrow="right">All news</ButtonLink>
            </Reveal>
          </div>
          <Rail as="div" className="mt-8 grid gap-6 sm:mt-12 md:grid-cols-2 lg:grid-cols-3">
            {latest.map((p, i) => (
              <Reveal key={p.id} delay={i * 90}>
                <PostCard post={p} />
              </Reveal>
            ))}
          </Rail>
        </Section>
      )}

      {/* ---------- FAQ (editable in admin) + help desk ---------- */}
      <Section className="border-t border-line bg-white">
        <div className="grid grid-cols-1 gap-10 sm:gap-14 lg:grid-cols-[1.35fr_0.9fr] lg:gap-20">
          <div>
            <SectionTitle eyebrow={titles.faqEyebrow} title={titles.faqTitle} />
            <div className="mt-7 sm:mt-10">
              <Faq items={content.faqs} />
            </div>
          </div>
          <HelpDesk contact={contact} />
        </div>
      </Section>

      {/* ---------- Blog (admin → News, type "Blog") ---------- */}
      {blog.length > 0 && (
        <Section className="border-t border-line">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <SectionTitle eyebrow={titles.blogEyebrow} title={titles.blogTitle} />
            <Reveal className="lg:mt-8">
              <ButtonLink href="/blog" variant="outline" arrow="right">
                All articles
              </ButtonLink>
            </Reveal>
          </div>
          <Rail className="mt-8 grid gap-6 sm:mt-12 md:grid-cols-2 lg:grid-cols-3">
            {blog.slice(0, 3).map((a, i) => (
              <Reveal as="li" key={a.slug} delay={i * 90}>
                <BlogCard article={a} />
              </Reveal>
            ))}
          </Rail>
        </Section>
      )}
    </>
  );
}
