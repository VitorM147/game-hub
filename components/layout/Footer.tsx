import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/ui/Logo";

export function Footer({ gameCount }: { gameCount: number }) {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid w-full max-w-[1360px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-6 w-6" />
            <Wordmark className="text-xl" />
          </div>
          <p className="mt-4 max-w-sm text-[14px] text-mute">
            Plataforma gamer para descobrir e jogar jogos independentes direto no navegador, quando o jogo é compatível. Catálogo atual:{" "}
            <span className="font-mono text-ink">{gameCount}</span> {gameCount === 1 ? "jogo" : "jogos"}.
          </p>
        </div>
        <nav aria-label="Rodapé">
          <h2 className="label mb-3 text-mute">Navegar</h2>
          <ul className="space-y-2 text-[14px]">
            <li><Link className="text-ink hover:text-accent" href="/games">Explorar jogos</Link></li>
            <li><Link className="text-ink hover:text-accent" href="/categorias">Categorias</Link></li>
            <li><Link className="text-ink hover:text-accent" href="/favoritos">Favoritos e histórico</Link></li>
            <li><Link className="text-ink hover:text-accent" href="/privacidade">Privacidade e avisos</Link></li>
            <li><Link className="text-ink hover:text-accent" href="/criadores">Criadores</Link></li>
            <li><Link className="text-ink hover:text-accent" href="/desenvolvedores">JoyStation Developers</Link></li>
            <li><Link className="text-ink hover:text-accent" href="/preferencias">Preferências</Link></li>
          </ul>
        </nav>
        <div>
          <h2 className="label mb-3 text-mute">Seus dados</h2>
          <p className="text-[14px] text-mute">
            Não há conta nem cadastro. Favoritos, histórico e preferências ficam salvos apenas neste navegador e podem ser apagados a
            qualquer momento.
          </p>
        </div>
      </div>
    </footer>
  );
}
