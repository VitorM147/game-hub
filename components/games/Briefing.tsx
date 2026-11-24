import { ControlsList } from "@/components/ui/Keys";
import type { CatalogGame } from "@/types/game";

/** Bloco editorial do jogo em destaque: história e controles (conteúdo real do jogo). */
export function Briefing({ game }: { game: CatalogGame }) {
  return (
    <section aria-labelledby="briefing" className="mx-auto w-full max-w-[1360px] px-4 pt-20 sm:px-6 lg:px-8">
      <div className="grid gap-px border border-line bg-line lg:grid-cols-[1.35fr_1fr]">
        <div className="bg-surface p-6 sm:p-9">
          <p className="label text-accent">Transmissão // {game.title}</p>
          <h2 id="briefing" className="mt-3 font-display text-[40px] font-bold uppercase leading-[0.95] sm:text-5xl">
            Última unidade
            <br />
            operacional
          </h2>
          <div className="mt-6 max-w-[58ch] space-y-4 text-[16px] leading-[1.7] text-ink/85">
            {game.story.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <ul className="mt-7 space-y-2.5 border-t border-line pt-5">
            {game.objectives.map((o, i) => (
              <li key={o} className="flex gap-3 text-[14px] text-ink/85">
                <span className="label mt-[3px] w-5 shrink-0 text-accent">{String(i + 1).padStart(2, "0")}</span>
                {o}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-card p-6 sm:p-9">
          <p className="label text-mute">Como jogar</p>
          <h3 className="mt-2 mb-5 font-display text-3xl font-bold uppercase">Controles</h3>
          <ControlsList controls={game.controls} />
        </div>
      </div>
    </section>
  );
}
