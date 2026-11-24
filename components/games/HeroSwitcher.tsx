"use client";

import { type ReactNode, useState } from "react";

/** Alterna entre os jogos em destaque. Sem rotação automática: quem lê decide quando trocar. */
export function HeroSwitcher({ slides }: { slides: { slug: string; title: string; node: ReactNode }[] }) {
  const [i, setI] = useState(0);
  if (slides.length === 0) return null;
  return (
    <div>
      <div key={slides[i].slug}>{slides[i].node}</div>
      {slides.length > 1 && (
        <div className="mx-auto mt-5 flex w-full max-w-[1360px] flex-wrap gap-2 px-4 sm:px-6 lg:px-8" role="tablist" aria-label="Jogos em destaque">
          {slides.map((s, idx) => (
            <button
              key={s.slug}
              type="button"
              role="tab"
              aria-selected={idx === i}
              onClick={() => setI(idx)}
              className={`border px-3 py-2 font-display text-[14px] font-semibold uppercase tracking-[0.06em] ${
                idx === i ? "border-accent text-accent" : "border-line text-mute hover:text-ink"
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
