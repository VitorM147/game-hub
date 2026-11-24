import type { Metadata } from "next";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: BRAND.developersName,
  description: "Como publicar um jogo na JoyStation: requisitos, formato do catálogo, créditos e licenças.",
};

const STEPS = [
  { t: "Prepare a build web", d: "Um index.html com os arquivos do jogo, funcionando offline-first e sem depender de CDN. O jogo roda dentro de um iframe do mesmo domínio." },
  { t: "Coloque em public/games/<slug>/web/", d: "O catálogo só marca o jogo como jogável se o arquivo de entrada existir de fato. Sem build, ele aparece como indisponível, nunca como jogável." },
  { t: "Cadastre em data/games.ts", d: "Título, descrição, categorias, mecânicas, controles, créditos reais, capa e capturas de tela. Use só imagens que você tem direito de usar." },
  { t: "Informe créditos e licença", d: "Cada jogo mantém o nome e a licença de quem o criou. A JoyStation não relicencia código de terceiros." },
  { t: "Valide", d: "Rode npm run lint, npm run typecheck e npm run build. O build gera a página do jogo, o sitemap e o player." },
];

const RULES = [
  "Sem cadastro, login ou coleta de dados pessoais: o progresso fica no navegador de quem joga.",
  "Sem anúncios, rastreadores ou scripts externos dentro do jogo.",
  "Só publique o que você criou ou tem permissão escrita para distribuir.",
  "Marcas, personagens e arte de terceiros não entram sem autorização.",
];

export default function DesenvolvedoresPage() {
  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 pb-4 pt-10 sm:px-6 lg:px-8">
      <header className="mb-10">
        <p className="label text-accent">Para criadores</p>
        <h1 className="mt-2 font-display text-5xl font-bold uppercase leading-none">{BRAND.developersName}</h1>
        <p className="mt-4 max-w-[60ch] text-[16px] leading-[1.7] text-ink/85">
          A JoyStation é feita para jogos independentes que rodam no navegador. Hoje a publicação é por pull request no repositório: não há
          painel, conta nem envio automático.
        </p>
      </header>

      <section aria-labelledby="passos">
        <h2 id="passos" className="font-display text-3xl font-bold uppercase">Como adicionar um jogo</h2>
        <ol className="mt-5 divide-y divide-line-soft border border-line bg-surface">
          {STEPS.map((s, i) => (
            <li key={s.t} className="flex gap-4 px-5 py-4">
              <span className="font-mono text-accent">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-display text-xl font-semibold">{s.t}</p>
                <p className="mt-1 text-[14px] text-mute">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="regras" className="mt-12">
        <h2 id="regras" className="font-display text-3xl font-bold uppercase">Regras da casa</h2>
        <ul className="mt-5 space-y-2">
          {RULES.map((r) => (
            <li key={r} className="flex gap-3 text-[14px] text-ink/85">
              <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 bg-accent" />
              {r}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-12 text-[14px] text-mute">
        Quer propor um jogo? Abra uma issue ou pull request em{" "}
        <a className="text-ink underline underline-offset-4 hover:text-accent" href={BRAND.repository} rel="noopener noreferrer" target="_blank">
          {BRAND.repository.replace("https://", "")}
        </a>
        .
      </p>
    </div>
  );
}
