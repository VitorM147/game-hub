import type { Metadata } from "next";
import { PreferencesView } from "@/components/games/PreferencesView";

export const metadata: Metadata = {
  title: "Preferências",
  robots: { index: false },
};

export default function PreferenciasPage() {
  return (
    <div className="mx-auto w-full max-w-[1360px] px-4 pb-4 pt-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="label text-accent">Neste navegador</p>
        <h1 className="mt-2 font-display text-5xl font-bold uppercase leading-none">Preferências</h1>
      </header>
      <PreferencesView />
    </div>
  );
}
