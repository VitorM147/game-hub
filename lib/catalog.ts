import "server-only";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { CATEGORIES } from "@/data/categories";
import { GAMES } from "@/data/games";
import { withBase } from "@/config/base-path";
import type { Availability, CatalogGame, Category, CategoryId, Game, Platform } from "@/types/game";

const PUBLIC_DIR = path.join(process.cwd(), "public");

function fileInfo(url?: string): { exists: boolean; sizeKB?: number } {
  if (!url || !url.startsWith("/")) return { exists: false };
  const file = path.join(PUBLIC_DIR, url.split("?")[0]);
  if (!existsSync(file)) return { exists: false };
  return { exists: true, sizeKB: Math.round(statSync(file).size / 1024) };
}

/**
 * A disponibilidade é decidida pelos arquivos que realmente existem:
 * sem build web em /public, o jogo é tratado como "somente download".
 */
function resolve(game: Game): CatalogGame {
  const web = game.launchMode === "web" && fileInfo(game.playableUrl).exists;
  const dl = fileInfo(game.downloadUrl);
  const availability: Availability =
    game.status === "coming-soon" ? "coming-soon" : web ? "web" : dl.exists ? "download" : "unavailable";
  const effectivePlatforms: Platform[] = game.platforms.filter((p) => p !== "web" || web);
  const img = <T extends { src: string }>(i: T): T => ({ ...i, src: withBase(i.src) });
  return {
    ...game,
    coverImage: img(game.coverImage),
    screenshots: game.screenshots.map(img),
    playableUrl: withBase(game.playableUrl),
    downloadUrl: withBase(game.downloadUrl),
    availability,
    effectivePlatforms,
    downloadSizeKB: dl.sizeKB,
  };
}

/** Catálogo jogável/navegável. Conteúdo editorial (notícias) fica de fora. */
export function getAllGames(): CatalogGame[] {
  return GAMES.filter((g) => g.status !== "hidden" && !g.editorial).map(resolve);
}

/** Radar editorial: títulos acompanhados como notícia, sem jogar nem baixar. */
export function getEditorialGames(): CatalogGame[] {
  return GAMES.filter((g) => g.status !== "hidden" && g.editorial).map(resolve);
}

export function getGameBySlug(slug: string): CatalogGame | undefined {
  return [...getAllGames(), ...getEditorialGames()].find((g) => g.slug === slug);
}

export function getFeaturedGame(): CatalogGame | undefined {
  const games = getAllGames().filter((g) => g.status === "published");
  // Em destaque: o publicado mais recentemente.
  return [...games].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))[0];
}

export function getRelatedGames(game: CatalogGame, limit = 4): CatalogGame[] {
  return getAllGames()
    .filter((g) => g.id !== game.id)
    .map((g) => ({ g, score: g.categories.filter((c) => game.categories.includes(c)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.g);
}

export function getCategories(): (Category & { count: number })[] {
  const games = getAllGames();
  return CATEGORIES.map((c) => ({ ...c, count: games.filter((g) => g.categories.includes(c.id)).length })).filter((c) => c.count > 0);
}

export function categoryLabel(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
