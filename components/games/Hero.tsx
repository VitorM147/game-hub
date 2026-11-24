import { AvailabilityBadge } from "@/components/ui/Availability";
import { Tag } from "@/components/ui/Tag";
import { HeroShowcase } from "@/components/games/HeroShowcase";
import { PlayActions } from "@/components/games/PlayActions";
import { categoryLabel } from "@/lib/catalog";
import type { CatalogGame } from "@/types/game";

/** Banner em destaque: arte grande à esquerda, painel de informação à direita (composição de loja digital). */
export function Hero({ game }: { game: CatalogGame }) {
  return (
    <section aria-labelledby="hero-title" className="mx-auto w-full max-w-[1360px] px-4 pt-8 sm:px-6 lg:px-8 lg:pt-10">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <HeroShowcase cover={game.coverImage} screenshots={game.screenshots} title={game.title} />

        <div className="flex flex-col lg:py-1">
          <p className="label flex items-center gap-2 text-accent">
            <span aria-hidden="true" className="h-px w-6 bg-accent" />
            Em destaque
          </p>
          <h1 id="hero-title" className="mt-3 font-display text-[44px] font-bold uppercase leading-[0.95] tracking-[0.01em] sm:text-[52px]">
            {game.title}
          </h1>
          {game.tagline && <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.06em] text-mute">{game.tagline}</p>}
          <p className="mt-4 text-[15px] leading-relaxed text-ink/85">{game.description}</p>

          <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Categorias">
            {game.categories.map((c) => (
              <li key={c}>
                <Tag href={`/games?category=${c}`}>{categoryLabel(c)}</Tag>
              </li>
            ))}
          </ul>

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 border-y border-line py-4 text-[13px]">
            <dt className="label text-mute">Status</dt>
            <dd>
              <AvailabilityBadge availability={game.availability} />
            </dd>
            <dt className="label text-mute">Controle</dt>
            <dd className="text-ink">{game.input.keyboard ? "Teclado" : "—"}{game.input.touch === "supported" ? " · Toque" : ""}</dd>
          </dl>

          <div className="mt-6">
            <PlayActions game={game} showDetails />
          </div>
          {game.availability === "download" && (
            <p className="mt-4 border-l-2 border-line pl-3 text-[13px] text-mute">
              A versão para o navegador ainda não está publicada neste portal. O download é a versão para computador.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
