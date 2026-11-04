import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site-url";


export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/driver", "/api", "/r", "/download"] },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
