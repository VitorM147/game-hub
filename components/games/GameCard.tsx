import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AvailabilityBadge } from "@/components/ui/Availability";
import { FavoriteButton } from "@/components/games/FavoriteButton";
import type { CatalogGame } from "@/types/game";

interface Props {
  game: CatalogGame;
  priority?: boolean;
  /** Linha extra sob o título (ex.: "há 2 h" no Continue jogando). */
  meta?: string;
}

export function GameCard({ game, priority = false, meta }: Props) {
  const playable = game.availability === "web";
  return (
    <article className="group relative flex flex-col border border-line bg-card transition-colors duration-150 hover:border-accent">
      <div className="relative aspect-video overflow-hidden bg-base">
        <Image
          src={game.coverImage.src}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.035]"
        />
        {/* Aviso de ação no hover/foco: só aparece onde há ação real. */}
        <span className="label absolute bottom-0 left-0 flex translate-y-full items-center gap-1.5 bg-accent px-3 py-1.5 text-accent-ink transition-transform duration-150 group-hover:translate-y-0 group-focus-within:translate-y-0">
          {game.availability === "web" ? "Jogar agora" : "Ver detalhes"}
          <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
        </span>
      </div>

      <FavoriteButton slug={game.slug} title={game.title} className="absolute right-2 top-2 z-20" />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <AvailabilityBadge availability={game.availability} />
        <h3 className="font-display text-[24px] font-bold leading-[1.05] text-ink">
          <Link href={playable ? `/play/${game.slug}` : `/games/${game.slug}`} className="after:absolute after:inset-0 after:z-10 focus-visible:outline-none">
            {game.title}
          </Link>
        </h3>
        <p className="text-[13px] text-mute">{game.genre}</p>
        {meta && <p className="label text-mute">{meta}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <p className="label text-mute">{game.developer ?? "Desenvolvedor independente"}</p>
          {playable && (
            <Link href={`/games/${game.slug}`} className="label relative z-20 text-mute underline-offset-4 hover:text-ink hover:underline">
              Detalhes
            </Link>
          )}
        </div>
      </div>
      {/* Anel de foco no card inteiro, já que o link é esticado. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 ring-2 ring-transparent group-focus-within:ring-accent" />
    </article>
  );
}
