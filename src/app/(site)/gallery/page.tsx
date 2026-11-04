import type { Metadata } from "next";
import { Camera } from "lucide-react";
import { Gallery } from "@/components/site/Gallery";
import { Reveal } from "@/components/site/motion";
import { PageHero, Section } from "@/components/site/ui";
import { getBlock } from "@/lib/content/store";
import { getGalleryPhotos } from "@/lib/photos";
import { ButtonLink } from "@/components/site/Button";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getBlock("listings.gallery");
  return { title: c.seoTitle, description: c.seoDescription };
}

export default async function GalleryPage() {
  const [photos, c] = await Promise.all([getGalleryPhotos(), getBlock("listings.gallery")]);
  return (
    <>
      <PageHero eyebrow={c.eyebrow} title={c.title} intro={c.intro} />
      <Section>
        {photos.length ? (
          <Gallery photos={photos} />
        ) : (
          <Reveal className="mx-auto max-w-lg rounded-[1.75rem] bg-white p-10 text-center ring-1 ring-line">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Camera className="h-6 w-6" />
            </span>
            <h2 className="type-h3 mt-5 text-navy">{c.emptyTitle}</h2>
            <p className="mt-2 text-ink/65">{c.emptyText}</p>
            {c.emptyButton && c.emptyLink && (
              <ButtonLink href={c.emptyLink} variant="secondary" size="sm" className="mt-6">
                {c.emptyButton}
              </ButtonLink>
            )}
          </Reveal>
        )}
      </Section>
    </>
  );
}
