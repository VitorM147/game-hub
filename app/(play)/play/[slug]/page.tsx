import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GamePlayer, type PlayerGame } from "@/components/player/GamePlayer";
import { getAllGames, getGameBySlug } from "@/lib/catalog";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllGames().filter((g) => g.availability !== "coming-soon").map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  return { title: game ? `Jogar ${game.title}` : "Jogar", robots: { index: false } };
}

export default async function PlayPage({ params }: Params) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game || game.availability === "coming-soon") notFound();

  const player: PlayerGame = {
    slug: game.slug,
    title: game.title,
    availability: game.availability,
    playableUrl: game.availability === "web" ? game.playableUrl : undefined,
    downloadUrl: game.downloadUrl,
    downloadSizeKB: game.downloadSizeKB,
    controls: game.controls,
    aspect: game.aspect,
    coverImage: game.coverImage,
    screenshots: game.screenshots,
    touchUntested: game.input.touch === "untested",
    touchSupported: game.input.touch === "supported",
  };

  return <GamePlayer game={player} />;
}
