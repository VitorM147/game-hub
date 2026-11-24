import type { Metadata } from "next";
import { CreatorsList } from "@/components/games/CreatorsList";

export const metadata: Metadata = {
  title: "Criadores",
  description: "A equipe que criou a JoyStation.",
};

export default function CriadoresPage() {
  return (
    <div className="mx-auto w-full max-w-[800px] px-4 pb-4 pt-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="label text-accent">Equipe</p>
        <h1 className="mt-2 font-display text-5xl font-bold uppercase leading-none">Criadores</h1>
        <p className="mt-4 max-w-[60ch] text-[15px] leading-[1.7] text-ink/85">
          Projeto de grupo da Universidade São Judas. Cada jogo da plataforma também traz os créditos de quem o criou na própria página.
        </p>
      </header>
      <CreatorsList />
    </div>
  );
}
