import { Suspense } from "react";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/session";
import { getImageChoices } from "@/lib/content/store";
import { readServices } from "@/lib/services";
import { NewService, ServiceEditor } from "./ServiceEditor";

export const metadata = { title: "Services · Admin" };

export default function ServicesAdminPage() {
  return (
    <Suspense fallback={<div className="h-[600px] animate-pulse rounded-2xl bg-ink/[0.06]" />}>
      <Services />
    </Suspense>
  );
}

async function Services() {
  await connection();
  await requireAdmin();
  const [services, images] = await Promise.all([readServices(), getImageChoices()]);
  return (
    <>
      <PageHeader title="Services" description="Every Praja Ride service on the website: menus, cards and its own page. Add, reorder, edit or remove them here; upload new photos in Website images." />
      <div className="space-y-3">
        {services.map((s, i) => (
          <ServiceEditor key={s.slug} service={s} images={images} first={i === 0} last={i === services.length - 1} />
        ))}
      </div>
      <div className="mt-6">
        <NewService />
      </div>
    </>
  );
}
