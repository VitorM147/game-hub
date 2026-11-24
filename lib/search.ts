import { normalize } from "@/lib/format";

export interface SearchableGame {
  slug: string;
  title: string;
  alternateTitle?: string;
  genre: string;
  tags: string[];
  categoryLabels: string[];
  description: string;
}

/** Busca por todos os termos digitados (E lógico) em título, gênero, tags e categorias. */
export function matchesQuery(game: SearchableGame, query: string): boolean {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalize(
    [game.title, game.alternateTitle ?? "", game.genre, game.tags.join(" "), game.categoryLabels.join(" "), game.description].join(" "),
  );
  return terms.every((t) => haystack.includes(t));
}
