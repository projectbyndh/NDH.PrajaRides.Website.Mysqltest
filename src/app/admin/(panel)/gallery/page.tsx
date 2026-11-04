import { Suspense } from "react";
import { connection } from "next/server";
import { ExternalLink } from "lucide-react";
import { btn, PageHeader } from "@/components/admin/ui";
import { listAllPhotos } from "@/lib/photos";
import { readServices } from "@/lib/services";
import { requireAdmin } from "@/lib/session";
import { GalleryManager } from "./GalleryManager";

export const metadata = { title: "Gallery · Admin" };

export default function GalleryPage() {
  return (
    <Suspense fallback={<div className="h-[600px] animate-pulse rounded-2xl bg-ink/[0.06]" />}>
      <Gallery />
    </Suspense>
  );
}

async function Gallery() {
  await connection();
  await requireAdmin();
  const [photos, services] = await Promise.all([listAllPhotos(), readServices()]);
  return (
    <>
      <PageHeader
        title="Gallery"
        description="Photos for the website's Gallery page, home page and About page."
        actions={
          <a href="/gallery" target="_blank" className={btn.secondary}>
            <ExternalLink className="h-4 w-4" /> View gallery
          </a>
        }
      />
      <GalleryManager photos={photos} services={services.map(({ slug, name }) => ({ slug, name }))} />
    </>
  );
}
