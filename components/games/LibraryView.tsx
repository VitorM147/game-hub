"use client";

import { Heart, History, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { GameCard } from "@/components/games/GameCard";
import { SectionHeading } from "@/components/games/SectionHeading";
import { ButtonLink, Button } from "@/components/ui/Button";
import { useFavorites, useHistory } from "@/hooks/useStore";
import { timeAgo } from "@/lib/format";
import { clearHistory, removeHistoryItem } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { CatalogGame } from "@/types/game";

function Empty({ icon, title, text, cta }: { icon: React.ReactNode; title: string; text: string; cta?: boolean }) {
  return (
    <div className="flex max-w-xl flex-col items-start gap-4 border border-dashed border-line p-8">
      <span className="text-mute">{icon}</span>
      <div>
        <p className="font-display text-3xl font-bold uppercase">{title}</p>
        <p className="mt-2 text-[14px] text-mute">{text}</p>
      </div>
      {cta && <ButtonLink href="/games">Explorar jogos</ButtonLink>}
    </div>
  );
}

export function LibraryView({ games }: { games: CatalogGame[] }) {
  const favorites = useFavorites();
  const history = useHistory();
  const [confirming, setConfirming] = useState(false);
  const bySlug = useMemo(() => new Map(games.map((g) => [g.slug, g])), [games]);

  const favGames = favorites.map((s) => bySlug.get(s)).filter((g): g is CatalogGame => !!g);
  const histItems = history
    .map((h) => ({ game: bySlug.get(h.slug), h }))
    .filter((x): x is { game: CatalogGame; h: (typeof history)[number] } => !!x.game);

  return (
    <div className="space-y-16">
      <section aria-labelledby="fav">
        <SectionHeading id="fav" eyebrow={`${favGames.length} salvo${favGames.length === 1 ? "" : "s"}`} title="Favoritos" />
        {favGames.length > 0 ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(260px,340px))] gap-5">
            {favGames.map((g) => (
              <li key={g.id} className="contents">
                <GameCard game={g} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            icon={<Heart aria-hidden="true" className="h-8 w-8" />}
            title="Nenhum favorito ainda"
            text="Use o coração nos cards ou na página do jogo para guardar títulos aqui."
            cta
          />
        )}
      </section>

      <section aria-labelledby="hist">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-3">
          <div>
            <p className="label mb-1.5 text-accent">Neste navegador</p>
            <h2 id="hist" className="font-display text-[30px] font-bold uppercase leading-none tracking-[0.03em]">
              Histórico de jogos
            </h2>
          </div>
          {histItems.length > 0 &&
            (confirming ? (
              <div className="flex items-center gap-2" role="alertdialog" aria-label="Confirmar limpeza do histórico">
                <span className="text-[13px] text-mute">Apagar todo o histórico?</span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    clearHistory();
                    setConfirming(false);
                    toast("Histórico apagado");
                  }}
                >
                  Sim, apagar
                </Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setConfirming(true)}>
                Limpar histórico
              </Button>
            ))}
        </div>
        {histItems.length > 0 ? (
          <ul className="divide-y divide-line-soft border border-line bg-surface">
            {histItems.map(({ game, h }) => (
              <li key={game.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <Link href={`/games/${game.slug}`} className="block truncate font-display text-2xl font-semibold hover:text-accent">
                    {game.title}
                  </Link>
                  <p className="label mt-1 text-mute">
                    Última sessão {timeAgo(h.lastPlayedAt)} · {h.plays} {h.plays === 1 ? "sessão" : "sessões"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {game.availability === "web" && (
                    <ButtonLink variant="secondary" href={`/play/${game.slug}`}>
                      Jogar de novo
                    </ButtonLink>
                  )}
                  <button
                    type="button"
                    aria-label={`Remover ${game.title} do histórico`}
                    onClick={() => {
                      removeHistoryItem(game.slug);
                      toast("Removido do histórico");
                    }}
                    className="grid h-11 w-11 place-items-center border border-line text-mute hover:border-accent hover:text-accent"
                  >
                    <X size={16} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            icon={<History aria-hidden="true" className="h-8 w-8" />}
            title="Histórico vazio"
            text="Quando você abrir um jogo no navegador, ele aparece aqui e na seção Continue jogando da página inicial."
          />
        )}
      </section>
    </div>
  );
}
