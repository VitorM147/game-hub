import type { Metadata } from "next";
import { GameGrid } from "@/components/games/GameGrid";
import { formatDate } from "@/lib/format";
import { getAllGames } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Novidades",
  description: "Jogos adicionados recentemente ao Game Hub, do mais novo para o mais antigo.",
};

export default function NovidadesPage() {
  const games = [...getAllGames()].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  const latest = games[0];
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pb-4 pt-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="label text-accent">Do mais novo ao mais antigo</p>
        <h1 className="mt-2 font-display text-5xl font-bold uppercase leading-none">Novidades</h1>
        {latest && (
          <p className="mt-3 text-[14px] text-mute">
            Último título publicado: <span className="text-ink">{latest.title}</span>, em {formatDate(latest.releaseDate)}.
          </p>
        )}
      </header>
      <GameGrid games={games} />
    </div>
  );
}
