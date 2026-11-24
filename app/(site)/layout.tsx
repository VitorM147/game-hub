import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import type { SearchEntry } from "@/components/navigation/HeaderSearch";
import { categoryLabel, getAllGames } from "@/lib/catalog";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const games = getAllGames();
  const entries: SearchEntry[] = games.map((g) => ({
    slug: g.slug,
    title: g.title,
    alternateTitle: g.alternateTitle,
    genre: g.genre,
    tags: g.tags,
    categoryLabels: g.categories.map(categoryLabel),
    description: g.description,
    cover: { src: g.coverImage.src, alt: g.coverImage.alt },
  }));

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-[200] bg-accent px-4 py-2 font-display font-semibold uppercase text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Pular para o conteúdo
      </a>
      <Header entries={entries} />
      <main id="conteudo" className="relative">
        {children}
      </main>
      <Footer gameCount={games.length} />
    </>
  );
}
