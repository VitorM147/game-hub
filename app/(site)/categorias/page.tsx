import type { Metadata } from "next";
import Link from "next/link";
import { GameGrid } from "@/components/games/GameGrid";
import { getAllGames, getCategories } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Categorias",
  description: "Navegue pelos jogos da JoyStation por categoria.",
};

export default function CategoriasPage() {
  const games = getAllGames();
  const categories = getCategories();
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pb-4 pt-10 sm:px-6 lg:px-8">
      <header className="mb-10">
        <p className="label text-accent">Navegar por gênero</p>
        <h1 className="mt-2 font-display text-5xl font-bold uppercase leading-none">Categorias</h1>
      </header>

      <div className="space-y-12">
        {categories.map((c) => (
          <section key={c.id} id={c.id} aria-labelledby={`h-${c.id}`}>
            <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-line pb-3">
              <div>
                <h2 id={`h-${c.id}`} className="font-display text-3xl font-bold uppercase">
                  {c.label}
                </h2>
                <p className="mt-1 text-[13px] text-mute">{c.description}</p>
              </div>
              <span className="label shrink-0 text-mute">
                {c.count} {c.count === 1 ? "jogo" : "jogos"}
              </span>
            </div>
            {c.count > 0 ? (
              <GameGrid games={games.filter((g) => g.categories.includes(c.id))} compact />
            ) : (
              <p className="border border-dashed border-line px-5 py-6 text-[14px] text-mute">
                Ainda não há jogos nesta categoria.{" "}
                <Link href="/games" className="text-ink underline underline-offset-4 hover:text-accent">
                  Ver o catálogo completo
                </Link>
                .
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
