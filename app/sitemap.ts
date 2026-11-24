import type { MetadataRoute } from "next";
import { getAllGames } from "@/lib/catalog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const games = getAllGames();
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/games`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/categorias`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/novidades`, changeFrequency: "weekly", priority: 0.5 },
    ...games.map((g) => ({ url: `${SITE_URL}/games/${g.slug}`, lastModified: g.releaseDate, priority: 0.8 })),
  ];
}
