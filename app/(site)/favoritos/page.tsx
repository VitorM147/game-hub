import type { Metadata } from "next";
import { LibraryView } from "@/components/games/LibraryView";
import { getAllGames } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Favoritos e histórico",
  description: "Seus jogos favoritos e o histórico de jogos abertos, salvos neste navegador.",
  robots: { index: false },
};

export default function FavoritosPage() {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pb-4 pt-10 sm:px-6 lg:px-8">
      <header className="mb-10">
        <p className="label text-accent">Sua biblioteca</p>
        <h1 className="mt-2 font-display text-5xl font-bold uppercase leading-none">Favoritos</h1>
        <p className="mt-3 max-w-xl text-[14px] text-mute">Tudo aqui fica salvo apenas neste navegador. Limpar os dados do site apaga a lista.</p>
      </header>
      <LibraryView games={getAllGames()} />
    </div>
  );
}
