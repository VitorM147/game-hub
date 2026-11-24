import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";
import { getAllGames } from "@/lib/catalog";

const SITE_URL = BRAND.siteUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  const games = getAllGames();
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/games`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/categorias`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/novidades`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/criadores`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/desenvolvedores`, changeFrequency: "yearly", priority: 0.3 },
    ...games.map((g) => ({ url: `${SITE_URL}/games/${g.slug}`, lastModified: g.releaseDate, priority: 0.8 })),
  ];
}
