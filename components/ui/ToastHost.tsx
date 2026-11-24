"use client";

import { useEffect, useState } from "react";
import { subscribeToast } from "@/lib/toast";

/** Confirmação curta de ações (favoritar, limpar histórico). Região "polite" para leitores de tela. */
export function ToastHost() {
  const [items, setItems] = useState<{ id: number; message: string }[]>([]);

  useEffect(() => {
    let counter = 0;
    return subscribeToast((message) => {
      const id = ++counter;
      setItems((cur) => [...cur.slice(-2), { id, message }]);
      window.setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 2600);
    });
  }, []);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-4 left-4 z-[100] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className="animate-toast-in border border-line border-l-2 border-l-accent bg-surface px-4 py-2.5 font-mono text-[12px] text-ink shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
