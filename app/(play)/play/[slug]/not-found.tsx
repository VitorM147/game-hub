import { ButtonLink } from "@/components/ui/Button";

export default function PlayNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="max-w-md">
        <p className="label text-alert">Erro 404</p>
        <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-none">Jogo não encontrado</h1>
        <p className="mt-3 text-mute">Não há nenhum jogo com esse endereço no catálogo.</p>
        <div className="mt-6">
          <ButtonLink href="/games">Voltar ao catálogo</ButtonLink>
        </div>
      </div>
    </main>
  );
}
