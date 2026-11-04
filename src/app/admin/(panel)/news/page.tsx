import { Suspense } from "react";
import { connection } from "next/server";
import { PageHeader } from "@/components/admin/ui";
import { listAllPosts } from "@/lib/posts";
import { requireAdmin } from "@/lib/session";
import { NewsManager } from "./NewsManager";

export const metadata = { title: "News · Admin" };

export default function NewsPage() {
  return (
    <Suspense fallback={<div className="h-[480px] animate-pulse rounded-2xl bg-ink/[0.06]" />}>
      <News />
    </Suspense>
  );
}

async function News() {
  await connection();
  await requireAdmin();
  const posts = await listAllPosts();
  return (
    <>
      <PageHeader title="News & offers" description="Announcements and promotions for the website's News page." />
      <NewsManager posts={posts} />
    </>
  );
}
