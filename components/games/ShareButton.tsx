"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast";

/** Compartilha a página do jogo: menu nativo quando existe; senão copia o link. Nada é enviado a servidores. */
export function ShareButton({ title, path }: { title: string; path: string }) {
  const [done, setDone] = useState(false);
  async function share() {
    const url = new URL(path, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      toast("Link copiado.");
      setTimeout(() => setDone(false), 2000);
    } catch {
      // Compartilhamento cancelado ou bloqueado pelo navegador.
    }
  }
  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex h-11 items-center gap-2 border border-line px-4 font-display text-[15px] font-semibold uppercase tracking-[0.06em] text-ink hover:border-accent hover:text-accent"
    >
      {done ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
      Compartilhar
    </button>
  );
}
