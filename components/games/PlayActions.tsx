import { Download, Play } from "lucide-react";
import { ButtonLink, ExternalButton } from "@/components/ui/Button";
import { FavoriteButton } from "@/components/games/FavoriteButton";
import { formatSize } from "@/lib/format";
import type { CatalogGame } from "@/types/game";

interface Props {
  game: CatalogGame;
  /** Mostra o botão "Ver detalhes" (usado no hero da Home). */
  showDetails?: boolean;
  showFavorite?: boolean;
}

/** Botões de ação coerentes com a disponibilidade real do jogo. */
export function PlayActions({ game, showDetails = false, showFavorite = true }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {game.availability === "web" ? (
        <ButtonLink variant="primary" icon={<Play aria-hidden="true" className="h-5 w-5 fill-current" />} href={`/play/${game.slug}`}>
          Jogar agora
        </ButtonLink>
      ) : game.availability === "coming-soon" ? (
        <span className="label inline-flex items-center gap-2 border border-line px-4 py-3 text-mute">
          Em breve · não roda no Game Hub
        </span>
      ) : game.availability === "download" && game.downloadUrl ? (
        <ExternalButton
          variant="primary"
          icon={<Download aria-hidden="true" className="h-5 w-5" />}
          href={game.downloadUrl}
          download
        >
          Baixar para PC{game.downloadSizeKB ? ` · ${formatSize(game.downloadSizeKB)}` : ""}
        </ExternalButton>
      ) : null}
      {showDetails && <ButtonLink href={`/games/${game.slug}`}>Ver detalhes</ButtonLink>}
      {showFavorite && <FavoriteButton slug={game.slug} title={game.title} variant="labeled" />}
    </div>
  );
}
