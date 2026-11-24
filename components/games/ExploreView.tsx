"use client";

import { SlidersHorizontal, SearchX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { GameCard } from "@/components/games/GameCard";
import { Button } from "@/components/ui/Button";
import { normalize } from "@/lib/format";
import { matchesQuery } from "@/lib/search";
import { usePrefs } from "@/hooks/useStore";
import type { CatalogGame, Category, CategoryId } from "@/types/game";

type Sort = "az" | "za" | "recent" | "oldest";
type AvailabilityFilter = "all" | "web" | "coming-soon";

interface Filters {
  q: string;
  category: CategoryId | "all";
  availability: AvailabilityFilter;
  sort: Sort;
}

const SORT_LABEL: Record<Sort, string> = {
  az: "Nome (A–Z)",
  za: "Nome (Z–A)",
  recent: "Mais recentes",
  oldest: "Mais antigos",
};

function parse(params: URLSearchParams, categories: Category[]): Filters {
  const category = params.get("category");
  const availability = params.get("availability");
  const sort = params.get("sort");
  return {
    q: params.get("q") ?? "",
    category: categories.some((c) => c.id === category) ? (category as CategoryId) : "all",
    availability: availability === "web" || availability === "coming-soon" ? availability : "all",
    sort: sort === "za" || sort === "recent" || sort === "oldest" ? sort : "az",
  };
}

function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.category !== "all") p.set("category", f.category);
  if (f.availability !== "all") p.set("availability", f.availability);
  if (f.sort !== "az") p.set("sort", f.sort);
  return p.toString();
}

function Radio<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
}: {
  legend: string;
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <fieldset>
      <legend className="label mb-2.5 text-mute">{legend}</legend>
      <div className="space-y-0.5">
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className={`flex cursor-pointer items-center justify-between gap-3 border-l-2 px-3 py-2 text-[14px] transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                checked ? "border-accent bg-card text-ink" : "border-transparent text-mute hover:bg-surface hover:text-ink"
              }`}
            >
              <input type="radio" name={name} value={o.value} checked={checked} onChange={() => onChange(o.value)} className="sr-only" />
              <span>{o.label}</span>
              {o.count !== undefined && <span className="label text-mute">{o.count}</span>}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ExploreView({ games, categories }: { games: CatalogGame[]; categories: (Category & { count: number })[] }) {
  const searchParams = useSearchParams();
  const prefs = usePrefs();

  const [filters, setFilters] = useState<Filters>(() => parse(new URLSearchParams(searchParams.toString()), categories));
  const [showFilters, setShowFilters] = useState(false);
  const lastQuery = useRef(toQuery(filters));

  // Navegação vinda de fora (ex.: busca do header) atualiza os filtros.
  useEffect(() => {
    const incoming = parse(new URLSearchParams(searchParams.toString()), categories);
    if (toQuery(incoming) !== lastQuery.current) {
      lastQuery.current = toQuery(incoming);
      setFilters(incoming);
    }
  }, [searchParams, categories]);

  function update(patch: Partial<Filters>) {
    setFilters((cur) => {
      const next = { ...cur, ...patch };
      const qs = toQuery(next);
      lastQuery.current = qs;
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
      return next;
    });
  }

  const results = useMemo(() => {
    const list = games.filter((g) => {
      if (!matchesQuery({ ...g, categoryLabels: g.categories.map((c) => categories.find((x) => x.id === c)?.label ?? c) }, filters.q)) return false;
      if (filters.category !== "all" && !g.categories.includes(filters.category)) return false;
      if (filters.availability === "web" && g.availability !== "web") return false;
      if (filters.availability === "coming-soon" && g.availability !== "coming-soon") return false;
      return true;
    });
    const by = {
      az: (a: CatalogGame, b: CatalogGame) => normalize(a.title).localeCompare(normalize(b.title), "pt-BR"),
      za: (a: CatalogGame, b: CatalogGame) => normalize(b.title).localeCompare(normalize(a.title), "pt-BR"),
      recent: (a: CatalogGame, b: CatalogGame) => b.releaseDate.localeCompare(a.releaseDate),
      oldest: (a: CatalogGame, b: CatalogGame) => a.releaseDate.localeCompare(b.releaseDate),
    }[filters.sort];
    return [...list].sort(by);
  }, [games, categories, filters]);

  const activeCount = [filters.category !== "all", filters.availability !== "all"].filter(Boolean).length;
  const hasAny = activeCount > 0 || filters.q.trim() !== "";

  const filterPanel = (
    <div className="space-y-7">
      <Radio
        legend="Categoria"
        name="category"
        value={filters.category}
        onChange={(v) => update({ category: v })}
        options={[
          { value: "all" as const, label: "Todas", count: games.length },
          ...categories.map((c) => ({ value: c.id as CategoryId | "all", label: c.label, count: c.count })),
        ]}
      />
      <Radio
        legend="Disponibilidade"
        name="availability"
        value={filters.availability}
        onChange={(v) => update({ availability: v })}
        options={[
          { value: "all", label: "Todas" },
          { value: "web", label: "Jogue agora", count: games.filter((g) => g.availability === "web").length },
          { value: "coming-soon", label: "Em breve", count: games.filter((g) => g.availability === "coming-soon").length },
        ]}
      />
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
      <aside aria-label="Filtros">
        <button
          type="button"
          aria-expanded={showFilters}
          aria-controls="painel-filtros"
          onClick={() => setShowFilters((v) => !v)}
          className="flex h-11 w-full items-center justify-between border border-line bg-surface px-4 font-display text-lg font-semibold uppercase tracking-[0.06em] lg:hidden"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" /> Filtros
          </span>
          {activeCount > 0 && <span className="label bg-accent px-1.5 text-accent-ink">{activeCount}</span>}
        </button>
        <div id="painel-filtros" className={`${showFilters ? "mt-4 block" : "hidden"} lg:mt-0 lg:block`}>
          {filterPanel}
        </div>
      </aside>

      <div>
        <div className="mb-6 flex flex-wrap items-end gap-4 border-b border-line pb-4">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="explore-q" className="label mb-2 block text-mute">
              Buscar neste catálogo
            </label>
            <input
              id="explore-q"
              type="search"
              value={filters.q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder="Título, gênero ou tag"
              autoComplete="off"
              className="h-11 w-full rounded-xs border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-mute focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="explore-sort" className="label mb-2 block text-mute">
              Ordenar por
            </label>
            <select
              id="explore-sort"
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as Sort })}
              className="h-11 rounded-xs border border-line bg-surface px-3 text-[15px] text-ink focus:border-accent focus:outline-none"
            >
              {(Object.keys(SORT_LABEL) as Sort[]).map((s) => (
                <option key={s} value={s}>
                  {SORT_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p aria-live="polite" className="label mb-5 text-mute">
          {results.length} {results.length === 1 ? "resultado" : "resultados"}
          {filters.q.trim() && (
            <>
              {" "}para <span className="text-ink">“{filters.q.trim()}”</span>
            </>
          )}
        </p>

        {results.length > 0 ? (
          <ul className={`grid gap-5 ${prefs.compactGrid ? "grid-cols-[repeat(auto-fill,minmax(220px,300px))]" : "grid-cols-[repeat(auto-fill,minmax(260px,340px))]"}`}>
            {results.map((g) => (
              <li key={g.id} className="contents">
                <GameCard game={g} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex max-w-xl flex-col items-start gap-4 border border-dashed border-line p-8">
            <SearchX aria-hidden="true" className="h-8 w-8 text-mute" />
            <div>
              <p className="font-display text-3xl font-bold uppercase">Nenhum jogo encontrado</p>
              <p className="mt-2 text-[14px] text-mute">
                {hasAny
                  ? "Nada no catálogo combina com essa busca e esses filtros. Tente outro termo ou remova algum filtro."
                  : "O catálogo ainda não tem jogos publicados."}
              </p>
            </div>
            {hasAny && (
              <Button onClick={() => update({ q: "", category: "all", availability: "all" })}>Limpar busca e filtros</Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
