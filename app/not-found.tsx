import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ButtonLink } from "@/components/ui/Button";

/** 404 global (rotas fora de qualquer grupo): mantém a identidade do portal. */
export default function GlobalNotFound() {
  return (
    <>
      <Header entries={[]} />
      <main className="mx-auto flex w-full max-w-[1360px] flex-col items-start px-4 py-24 sm:px-6 lg:px-8">
        <p className="label text-alert">Erro 404 // sinal perdido</p>
        <h1 className="mt-4 font-display text-[88px] font-bold uppercase leading-[0.85] sm:text-[140px]">Setor não encontrado</h1>
        <p className="mt-6 max-w-lg text-[16px] text-mute">A página que você procurou não existe ou foi movida.</p>
        <div className="mt-8 flex gap-3">
          <ButtonLink variant="secondary" href="/">Voltar ao início</ButtonLink>
          <ButtonLink variant="secondary" href="/games">Explorar jogos</ButtonLink>
        </div>
      </main>
      <Footer gameCount={0} />
    </>
  );
}
