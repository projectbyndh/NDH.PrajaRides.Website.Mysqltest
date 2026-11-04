import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, PageHeader } from "@/components/admin/ui";
import { blocksForPage, PAGES } from "@/lib/content/blocks";

export const metadata = { title: "Page content · Admin" };

export default function ContentIndexPage() {
  return (
    <>
      <PageHeader title="Page content" description="Every section of every website page: headlines, intros, cards, steps and questions. Pick a page to edit it." />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PAGES.map((p) => {
          const n = blocksForPage(p.key).length;
          return (
            <li key={p.key}>
              <Link href={`/admin/content/${p.key}`} className="block">
                <Card className="flex items-center justify-between gap-4 transition hover:ring-ink/20">
                  <span>
                    <span className="block font-bold">{p.label}</span>
                    <span className="text-sm text-ink/55">
                      {p.path} · {n} {n === 1 ? "section" : "sections"}
                    </span>
                  </span>
                  <ArrowRight className="h-5 w-5 text-ink/40" />
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
