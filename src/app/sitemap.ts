import type { MetadataRoute } from "next";
import { serviceHref } from "@/components/site/brand-services";
import { postHref } from "@/lib/post-format";
import { getPublishedPosts } from "@/lib/posts";
import { getServices } from "@/lib/services";
import { SITE_ORIGIN } from "@/lib/site-url";

// Public Praja Ride pages only; admin, driver portal and tracking links stay out of search.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const services = await getServices();
  const pages = [
    { path: "/", priority: 1 },
    { path: "/services", priority: 0.9 },
    ...services.map((s) => ({ path: serviceHref(s), priority: 0.8 })),
    { path: "/nepcab", priority: 0.8 },
    { path: "/drive", priority: 0.9 },
    { path: "/safety", priority: 0.7 },
    { path: "/business", priority: 0.7 },
    { path: "/about", priority: 0.6 },
    { path: "/news", priority: 0.6 },
    { path: "/blog", priority: 0.6 },
    { path: "/gallery", priority: 0.5 },
    { path: "/careers", priority: 0.5 },
    { path: "/contact", priority: 0.6 },
    { path: "/drive/status", priority: 0.3 },
    { path: "/press", priority: 0.3 },
    { path: "/privacy", priority: 0.2 },
    { path: "/terms", priority: 0.2 },
  ].map(({ path, priority }) => ({ url: `${SITE_ORIGIN}${path}`, changeFrequency: "monthly" as const, priority }));
  const posts = (await getPublishedPosts()).map((p) => ({
    url: `${SITE_ORIGIN}${postHref(p)}`,
    lastModified: p.updatedAt,
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }));
  return [...pages, ...posts];
}
