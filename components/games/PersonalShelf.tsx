"use client";

import { useMemo } from "react";
import { GameCard } from "@/components/games/GameCard";
import { SectionHeading } from "@/components/games/SectionHeading";
import { useFavorites, useHistory } from "@/hooks/useStore";
import { timeAgo } from "@/lib/format";
import type { CatalogGame } from "@/types/game";

/** Prateleiras pessoais (lidas do localStorage). Não renderiza nada quando estão vazias. */
export function PersonalShelf({
  kind,
  games,
  action,
}: {
  kind: "history" | "favorites";
  games: CatalogGame[];
  action?: { href: string; label: string };
}) {
  const history = useHistory();
  const favorites = useFavorites();

  const items = useMemo(() => {
    const bySlug = new Map(games.map((g) => [g.slug, g]));
    if (kind === "history") {
      return history
        .map((h) => ({ game: bySlug.get(h.slug), meta: `${timeAgo(h.lastPlayedAt)} · ${h.plays} ${h.plays === 1 ? "sessão" : "sessões"}` }))
        .filter((x): x is { game: CatalogGame; meta: string } => !!x.game);
    }
    return favorites.map((s) => ({ game: bySlug.get(s), meta: undefined })).filter((x): x is { game: CatalogGame; meta: undefined } => !!x.game);
  }, [kind, history, favorites, games]);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby={`shelf-${kind}`} className="mx-auto w-full max-w-[1360px] px-4 pt-14 sm:px-6 lg:px-8">
      <SectionHeading
        id={`shelf-${kind}`}
        eyebrow={kind === "history" ? "Neste navegador" : "Salvos por você"}
        title={kind === "history" ? "Continue jogando" : "Seus favoritos"}
        action={action}
      />
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,340px))] gap-5">
        {items.map(({ game, meta }) => (
          <li key={game.id} className="contents">
            <GameCard game={game} meta={meta} />
          </li>
        ))}
      </ul>
      {kind === "history" && (
        <p className="mt-3 text-[12px] text-mute">Abre o jogo de novo. Este título não tem salvamento de partida, então cada sessão recomeça do menu.</p>
      )}
    </section>
  );
}
