"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { useIsFavorite } from "@/hooks/useStore";
import { toggleFavorite } from "@/lib/store";
import { toast } from "@/lib/toast";

interface Props {
  slug: string;
  title: string;
  /** `icon` = botão quadrado sobre capas; `labeled` = botão com texto. */
  variant?: "icon" | "labeled";
  className?: string;
}

export function FavoriteButton({ slug, title, variant = "icon", className = "" }: Props) {
  const active = useIsFavorite(slug);
  const [popKey, setPopKey] = useState(0);

  function onClick(e: React.MouseEvent) {
    // O botão fica sobre um card clicável; não deixa o clique virar navegação.
    e.preventDefault();
    e.stopPropagation();
    const added = toggleFavorite(slug);
    setPopKey((k) => k + 1);
    toast(added ? `${title} foi para os favoritos` : `${title} saiu dos favoritos`);
  }

  const label = active ? `Remover ${title} dos favoritos` : `Adicionar ${title} aos favoritos`;
  const icon = (
    <Heart
      key={popKey}
      aria-hidden="true"
      className={`h-[18px] w-[18px] ${popKey > 0 ? "animate-pop" : ""} ${active ? "fill-accent text-accent" : "text-ink"}`}
    />
  );

  if (variant === "labeled") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className={`inline-flex h-12 items-center justify-center gap-2.5 rounded-xs border px-5 font-display text-[17px] font-semibold uppercase tracking-[0.08em] transition-colors ${
          active ? "border-accent text-accent" : "border-line bg-surface text-ink hover:border-mute hover:bg-card"
        } ${className}`}
      >
        {icon}
        {active ? "Nos favoritos" : "Favoritar"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      className={`grid h-9 w-9 place-items-center rounded-xs border border-black/40 bg-base/85 transition-colors hover:bg-base ${className}`}
    >
      {icon}
    </button>
  );
}
