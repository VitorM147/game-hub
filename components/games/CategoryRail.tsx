import Link from "next/link";
import type { Category } from "@/types/game";

/** Navegação horizontal de categorias. Categorias sem jogos aparecem apagadas, sem inventar conteúdo. */
export function CategoryRail({ categories, total }: { categories: (Category & { count: number })[]; total: number }) {
  return (
    <nav aria-label="Categorias" className="mx-auto w-full max-w-[1360px] px-4 pt-12 sm:px-6 lg:px-8">
      <ul className="rail flex gap-2 overflow-x-auto pb-2">
        <li className="shrink-0">
          <Link
            href="/games"
            className="flex items-baseline gap-2.5 border border-line bg-surface px-4 py-3 font-display text-[19px] font-semibold uppercase tracking-[0.06em] hover:border-accent"
          >
            Todos <span className="label text-mute">{total}</span>
          </Link>
        </li>
        {categories.map((c) => (
          <li key={c.id} className="shrink-0">
            <Link
              href={`/games?category=${c.id}`}
              className={`flex items-baseline gap-2.5 border px-4 py-3 font-display text-[19px] font-semibold uppercase tracking-[0.06em] transition-colors ${
                c.count > 0 ? "border-line bg-surface text-ink hover:border-accent" : "border-line-soft text-mute hover:border-line"
              }`}
            >
              {c.label} <span className="label text-mute">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
