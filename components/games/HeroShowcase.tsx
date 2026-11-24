"use client";

import Image from "next/image";
import { useState } from "react";
import type { ImageAsset } from "@/types/game";

/** Vitrine do hero: arte de capa + capturas reais. Trocar a miniatura troca a imagem principal. */
export function HeroShowcase({ cover, screenshots, title }: { cover: ImageAsset; screenshots: ImageAsset[]; title: string }) {
  const items: (ImageAsset & { label: string })[] = [
    { ...cover, label: "Arte de capa" },
    ...screenshots.map((s) => ({ ...s, label: s.caption ?? "Captura de tela" })),
  ];
  const [index, setIndex] = useState(0);
  const current = items[index];

  return (
    <div className="min-w-0">
      <div className="relative aspect-video overflow-hidden border border-line bg-base">
        <Image
          key={current.src}
          src={current.src}
          alt={current.alt}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 66vw, 100vw"
          className={index === 0 ? "object-cover" : "object-contain [image-rendering:pixelated]"}
        />
        <span className="label absolute left-0 top-0 bg-base px-3 py-1.5 text-ink">{current.label}</span>
      </div>
      <div
        role="group"
        aria-label={`Imagens de ${title}`}
        className="rail mt-2 flex gap-2 overflow-x-auto pb-1"
      >
        {items.map((item, i) => (
          <button
            key={item.src}
            type="button"
            onClick={() => setIndex(i)}
            aria-pressed={i === index}
            aria-label={`Ver: ${item.label}`}
            className={`relative aspect-video w-[104px] shrink-0 overflow-hidden border bg-base transition-opacity sm:w-[120px] ${
              i === index ? "border-accent" : "border-line opacity-60 hover:opacity-100"
            }`}
          >
            <Image src={item.src} alt="" fill sizes="120px" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
