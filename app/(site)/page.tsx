import { Briefing } from "@/components/games/Briefing";
import { CategoryRail } from "@/components/games/CategoryRail";
import { GameGrid } from "@/components/games/GameGrid";
import { Hero } from "@/components/games/Hero";
import { HeroSwitcher } from "@/components/games/HeroSwitcher";
import { PersonalShelf } from "@/components/games/PersonalShelf";
import { SectionHeading } from "@/components/games/SectionHeading";
import { getAllGames, getCategories, getFeaturedGame } from "@/lib/catalog";

/** Abaixo disso o catálogo é "pequeno": seções que só repetiriam os mesmos cards ficam ocultas. */
const SMALL_CATALOG = 3;

export default function HomePage() {
  const games = getAllGames();
  const featured = getFeaturedGame();
  const categories = getCategories();
  const slides = [...games].filter((g) => g.status === "published").sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)).slice(0, 4).map((g) => ({ slug: g.slug, title: g.title, node: <Hero game={g} /> }));
  const small = games.length <= SMALL_CATALOG;
  const recent = [...games].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate)).slice(0, 4);

  return (
    <>
      <div aria-hidden="true" className="dot-grid pointer-events-none absolute inset-x-0 top-0 -z-0 h-[480px]" />
      <div className="relative">
        {featured ? <HeroSwitcher slides={slides} /> : null}

        <CategoryRail categories={categories} total={games.length} />

        <PersonalShelf kind="history" games={games} />
        <PersonalShelf kind="favorites" games={games} action={{ href: "/favoritos", label: "Gerenciar" }} />

        <section aria-labelledby="todos" className="mx-auto w-full max-w-[1360px] px-4 pt-14 sm:px-6 lg:px-8">
          <SectionHeading
            id="todos"
            eyebrow={`${games.length} ${games.length === 1 ? "título" : "títulos"} no catálogo`}
            title="Todos os jogos"
            action={{ href: "/games", label: "Explorar com filtros" }}
          />
          <GameGrid games={games} />
          {small && (
            <p className="mt-5 max-w-xl text-[13px] text-mute">
              O catálogo está começando. Novos jogos aparecem aqui assim que forem publicados.
            </p>
          )}
        </section>

        {!small && (
          <section aria-labelledby="recentes" className="mx-auto w-full max-w-[1360px] px-4 pt-14 sm:px-6 lg:px-8">
            <SectionHeading id="recentes" title="Adicionados recentemente" action={{ href: "/novidades", label: "Ver novidades" }} />
            <GameGrid games={recent} />
          </section>
        )}

        {/* Uma prateleira por categoria, mas só quando o catálogo é grande o bastante para não repetir cards. */}
        {!small &&
          categories
            .filter((c) => c.count > 0)
            .map((c) => (
              <section key={c.id} aria-labelledby={`cat-${c.id}`} className="mx-auto w-full max-w-[1360px] px-4 pt-14 sm:px-6 lg:px-8">
                <SectionHeading
                  id={`cat-${c.id}`}
                  title={c.label}
                  action={{ href: `/games?category=${c.id}`, label: "Ver todos" }}
                />
                <GameGrid games={games.filter((g) => g.categories.includes(c.id))} compact />
              </section>
            ))}

        {featured ? <Briefing game={featured} /> : null}
      </div>
    </>
  );
}
