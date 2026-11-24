"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col items-start justify-center px-6 py-24">
      <p className="label text-alert">Falha inesperada</p>
      <h1 className="mt-3 font-display text-6xl font-bold uppercase leading-none">Algo saiu do trilho</h1>
      <p className="mt-4 text-mute">A página não carregou como esperado. Tente de novo; se persistir, recarregue o navegador.</p>
      {error.digest && <p className="mt-3 font-mono text-[12px] text-mute">ref: {error.digest}</p>}
      <div className="mt-8">
        <Button variant="secondary" onClick={reset}>Tentar novamente</Button>
      </div>
    </main>
  );
}
