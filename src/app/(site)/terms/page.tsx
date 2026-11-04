import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getBlock } from "@/lib/content/store";

// Text edited in admin → Page content → Privacy & terms.
export async function generateMetadata(): Promise<Metadata> {
  const c = await getBlock("legal.terms");
  return { title: c.title, description: c.seoDescription };
}

export default async function TermsPage() {
  return <LegalPage content={await getBlock("legal.terms")} />;
}
