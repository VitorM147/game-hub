import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";

const SITE_URL = BRAND.siteUrl;

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/play/"] }, sitemap: `${SITE_URL}/sitemap.xml` };
}
