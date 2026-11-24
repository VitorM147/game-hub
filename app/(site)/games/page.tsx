import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploreView } from "@/components/games/ExploreView";
import { getAllGames, getCategories, getEditorialGames } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Explorar jogos",
  description: "Catálogo da JoyStation, com títulos em breve, busca, filtros por categoria, plataforma e disponibilidade.",
};

export default function ExplorePage() {
  // Títulos "Em breve"/de terceiros aparecem aqui só como cartão informativo (sem jogar nem baixar).
  const games = [...getAllGames(), ...getEditorialGames()];
  const categories = getCategories();
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pb-4 pt-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="label text-accent">Catálogo</p>
        <h1 className="mt-2 font-display text-5xl font-bold uppercase leading-none">Explorar jogos</h1>
      </header>
      {/* useSearchParams exige Suspense; o fallback já mostra a estrutura da página. */}
      <Suspense fallback={<p className="label min-h-[80vh] text-mute">Carregando catálogo…</p>}>
        <ExploreView games={games} categories={categories} />
      </Suspense>
    </div>
  );
}
