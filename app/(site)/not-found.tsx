import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-col items-start px-4 py-24 sm:px-6 lg:px-8">
      <p className="label text-alert">Erro 404 // sinal perdido</p>
      <h1 className="mt-4 font-display text-[88px] font-bold uppercase leading-[0.85] sm:text-[140px]">Setor não encontrado</h1>
      <p className="mt-6 max-w-lg text-[16px] text-mute">
        A página que você procurou não existe ou foi movida. O RX-7 também não achou nada por aqui.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink variant="secondary" href="/">
          Voltar ao início
        </ButtonLink>
        <ButtonLink variant="secondary" href="/games">
          Explorar jogos
        </ButtonLink>
      </div>
      <p className="mt-10 font-mono text-[12px] text-mute">
        ou tente a busca no topo — atalho: <Link href="/games" className="underline underline-offset-4">/</Link>
      </p>
    </div>
  );
}
