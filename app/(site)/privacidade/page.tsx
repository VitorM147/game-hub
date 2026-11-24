import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { withBase } from "@/config/base-path";

export const metadata: Metadata = {
  title: "Privacidade e avisos legais",
  description: "Quais dados a JoyStation guarda (nenhum no servidor), créditos dos jogos, marcas e como relatar um problema.",
};

const H = "mt-10 font-display text-3xl font-bold uppercase";
const P = "mt-3 max-w-[68ch] text-[15px] leading-[1.7] text-ink/85";

export default function PrivacidadePage() {
  return (
    <div className="mx-auto w-full max-w-[900px] px-4 pb-4 pt-10 sm:px-6 lg:px-8">
      <header>
        <p className="label text-accent">Transparência</p>
        <h1 className="mt-2 font-display text-5xl font-bold uppercase leading-none">Privacidade e avisos legais</h1>
        <p className={P}>Resumo curto: a {BRAND.name} não pede cadastro, não usa cookies e não envia seus dados para nenhum servidor nosso.</p>
      </header>

      <h2 className={H}>O que fica salvo e onde</h2>
      <p className={P}>
        Favoritos, histórico de jogos, preferências de tela e os recordes de cada jogo ficam no armazenamento local (localStorage) do seu
        navegador, neste aparelho. Não existe conta, banco de dados nem sincronização. Você pode apagar tudo em{" "}
        <Link className="underline underline-offset-4 hover:text-accent" href="/preferencias">Preferências</Link> ou limpando os dados do site no navegador.
      </p>

      <h2 className={H}>Cookies, anúncios e rastreadores</h2>
      <p className={P}>
        Não usamos cookies, anúncios, Google Analytics nem pixels de rastreamento, e a página não carrega scripts, fontes ou imagens de
        terceiros. O site é servido pelo GitHub Pages, que pode registrar dados técnicos de acesso (como endereço IP) segundo a política de
        privacidade do próprio GitHub; não temos acesso a esses registros nem os combinamos com nada.
      </p>

      <h2 className={H}>Jogos, créditos e licenças</h2>
      <p className={P}>
        Cada jogo mostra na sua página quem o criou. ORION — Protocolo RX-7, NEBLINA — Os Três Arcanos e RIO REDLINE pertencem aos seus
        autores, que mantêm os direitos sobre código, arte e som. A {BRAND.name} só os exibe e não relicencia nenhum deles. Se você é autor
        de um jogo aqui e quer ajustar créditos ou pedir a remoção, abra uma issue em{" "}
        <a className="underline underline-offset-4 hover:text-accent" href={`${BRAND.repository}/issues`} rel="noopener noreferrer" target="_blank">
          {BRAND.repository.replace("https://", "")}/issues
        </a>
        .
      </p>

      <h2 className={H}>Marcas de terceiros</h2>
      <p className={P}>
        Grand Theft Auto e Rockstar Games são marcas de seus respectivos donos. O cartão do GTA VI é apenas informativo: não há parceria,
        patrocínio nem vínculo com a Rockstar Games ou a Take-Two, e o jogo não pode ser jogado nem baixado aqui. Outras marcas citadas
        pertencem a seus titulares.
      </p>

      <h2 className={H}>Relatar um problema de segurança</h2>
      <p className={P}>
        Encontrou uma falha? Veja o arquivo SECURITY.md do repositório ou o endereço em{" "}
        <a className="underline underline-offset-4 hover:text-accent" href={withBase("/.well-known/security.txt")}>/.well-known/security.txt</a>. Não
        publique detalhes de vulnerabilidades em issues públicas.
      </p>

      <h2 className={H}>Sem garantias</h2>
      <p className={P}>
        A plataforma é um projeto acadêmico e independente, oferecido como está, sem garantia de disponibilidade. Notas de qualidade citadas
        na documentação são estimativas internas, não certificação nem auditoria independente.
      </p>
    </div>
  );
}
