import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { btn, PageHeader } from "@/components/admin/ui";
import { blocksForPage, PAGES, type BlockKey } from "@/lib/content/blocks";
import { getImageChoices, readBlock } from "@/lib/content/store";
import { requireAdmin } from "@/lib/session";
import { BlockEditor } from "../BlockEditor";

export const metadata = { title: "Page content · Admin" };

export default function ContentPage(props: PageProps<"/admin/content/[page]">) {
  return (
    <Suspense fallback={<div className="h-[600px] animate-pulse rounded-2xl bg-ink/[0.06]" />}>
      <Editor params={props.params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: PageProps<"/admin/content/[page]">["params"] }) {
  await connection();
  await requireAdmin();
  const { page } = await params;
  const def = PAGES.find((p) => p.key === page);
  if (!def) notFound();
  const blocks = blocksForPage(page);
  const [images, ...data] = await Promise.all([getImageChoices(), ...blocks.map((b) => readBlock(b.key as BlockKey))]);
  return (
    <>
      <PageHeader
        title={def.label}
        description="Edit any section and press Save. Text can use {phone}, {tollFree}, {email}, {address}, {city}, {area} and {company}."
        actions={
          <>
            <Link href="/admin/content" className={btn.secondary}>
              <ArrowLeft className="h-4 w-4" /> All pages
            </Link>
            <a href={def.path} target="_blank" className={btn.secondary}>
              <ExternalLink className="h-4 w-4" /> View page
            </a>
          </>
        }
      />
      <div className="space-y-6">
        {blocks.length === 0 && <p className="text-sm text-ink/55">This page has no editable sections yet.</p>}
        {blocks.map((b, i) => (
          <BlockEditor key={b.key} blockKey={b.key} title={b.title} description={b.description} fields={b.fields} initial={data[i] as Record<string, unknown>} images={images} />
        ))}
      </div>
    </>
  );
}
