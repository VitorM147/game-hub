import type { Metadata } from "next";
import { GameGrid } from "@/components/games/GameGrid";
import { formatDate } from "@/lib/format";
import { getAllGames, getEditorialGames } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Novidades",
  description: "Jogos adicionados recentemente à JoyStation, do mais novo para o mais antigo.",
};

export default function NovidadesPage() {
  const games = [...getAllGames()].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  const latest = games[0];
  const editorial = getEditorialGames();
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
      {editorial.length > 0 && (
        <section aria-labelledby="radar" className="mt-16">
          <p className="label text-accent">Só notícia</p>
          <h2 id="radar" className="mt-2 font-display text-3xl font-bold uppercase leading-none">Radar do mercado</h2>
          <p className="mt-3 max-w-xl text-[14px] text-mute">
            Lançamentos de terceiros que acompanhamos como informação. Não fazem parte do catálogo, não rodam aqui e não há download.
          </p>
          <div className="mt-6"><GameGrid games={editorial} compact /></div>
        </section>
      )}
    </div>
  );
}
