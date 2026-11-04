import { Suspense } from "react";
import { connection } from "next/server";
import { Card, PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/session";
import { listSiteImages } from "@/lib/site-image-store";
import { SITE_IMAGE_SLOTS } from "@/lib/site-images";
import { SlotCard } from "./SlotCard";

export const metadata = { title: "Website images · Admin" };

export default function WebsiteImagesPage() {
  return (
    <Suspense fallback={<div className="h-[600px] animate-pulse rounded-2xl bg-ink/[0.06]" />}>
      <WebsiteImages />
    </Suspense>
  );
}

async function WebsiteImages() {
  await connection();
  await requireAdmin();
  const stored = new Map((await listSiteImages()).map((s) => [s.slot, s]));
  const groups = [...new Set(SITE_IMAGE_SLOTS.map((s) => s.group))];
  return (
    <>
      <PageHeader
        title="Website images"
        description="The photos on the website's pages and service pages. Replace any of them with your own; changes show on the site within about 15 minutes."
      />
      <div className="space-y-6">
        {groups.map((group) => (
          <Card key={group}>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-ink/45">{group}</h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {SITE_IMAGE_SLOTS.filter((s) => s.group === group).map((s) => {
                const info = stored.get(s.slot);
                return <SlotCard key={s.slot} slot={s.slot} label={s.label} alt={s.alt} stored={!!info} version={info?.version ?? null} />;
              })}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
