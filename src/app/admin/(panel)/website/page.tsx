import { Suspense } from "react";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/session";
import { readSiteContent } from "@/lib/site-content";
import { WebsiteForm } from "./WebsiteForm";

export const metadata = { title: "Website · Admin" };

export default function WebsitePage() {
  return (
    <Suspense fallback={<div className="h-[600px] animate-pulse rounded-2xl bg-ink/[0.06]" />}>
      <Website />
    </Suspense>
  );
}

async function Website() {
  await connection();
  await requireAdmin();
  const content = await readSiteContent();
  return (
    <>
      <PageHeader title="Website" description="Edit the Praja Ride website. Changes go live as soon as you save." />
      <WebsiteForm key={JSON.stringify(content)} content={content} />
    </>
  );
}
