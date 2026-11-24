import { GameCard } from "@/components/games/GameCard";
import type { CatalogGame } from "@/types/game";

/** Grade que se adapta ao tamanho do catálogo: com poucos jogos, as colunas não esticam os cards. */
export function GameGrid({ games, compact = false, priorityFirst = false }: { games: CatalogGame[]; compact?: boolean; priorityFirst?: boolean }) {
  return (
    <ul
      className={`grid gap-5 ${
        compact
          ? "grid-cols-[repeat(auto-fill,minmax(220px,300px))]"
          : "grid-cols-[repeat(auto-fill,minmax(280px,380px))]"
      }`}
    >
      {games.map((g, i) => (
        <li key={g.id} className="contents">
          <GameCard game={g} priority={priorityFirst && i === 0} />
        </li>
      ))}
    </ul>
  );
}
