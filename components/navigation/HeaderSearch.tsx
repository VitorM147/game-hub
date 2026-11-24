"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { matchesQuery, type SearchableGame } from "@/lib/search";

export interface SearchEntry extends SearchableGame {
  cover: { src: string; alt: string };
}

interface Props {
  entries: SearchEntry[];
  onNavigate?: () => void;
  className?: string;
}

/** Busca com resultados em tempo real (padrão combobox/listbox, navegável por teclado). */
export function HeaderSearch({ entries, onNavigate, className = "" }: Props) {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(
    () => (query.trim() ? entries.filter((e) => matchesQuery(e, query)).slice(0, 6) : []),
    [entries, query],
  );

  // Atalho "/" foca a busca, como em lojas e launchers.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(path: string) {
    setOpen(false);
    setQuery("");
    setActive(-1);
    onNavigate?.();
    router.push(path);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && results[active]) go(`/games/${results[active].slug}`);
      else if (query.trim()) go(`/games?q=${encodeURIComponent(query.trim())}`);
    }
  }

  const listId = `${id}-list`;
  const showList = open && query.trim().length > 0;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <label htmlFor={`${id}-input`} className="sr-only">
        Buscar jogos
      </label>
      <div className="flex h-10 items-center gap-2 rounded-xs border border-line bg-surface px-3 transition-colors focus-within:border-accent">
        <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-mute" />
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          placeholder="Buscar jogos"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-mute [&::-webkit-search-cancel-button]:hidden"
        />
        <kbd className="keycap hidden !h-5 !min-w-5 !px-1 !text-[10px] lg:inline-flex" aria-hidden="true">
          /
        </kbd>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Resultados da busca"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[22rem] overflow-auto border border-line bg-surface shadow-2xl"
        >
          {results.length === 0 ? (
            <li role="presentation" className="px-4 py-4 text-[14px] text-mute">
              Nenhum jogo encontrado para <span className="text-ink">“{query.trim()}”</span>.
            </li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.slug}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(`/games/${r.slug}`)}
                className={`flex cursor-pointer items-center gap-3 p-2.5 ${i === active ? "bg-card" : ""}`}
              >
                <span className="relative block h-11 w-20 shrink-0 overflow-hidden bg-base">
                  <Image src={r.cover.src} alt="" fill sizes="80px" className="object-cover" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-display text-[17px] font-semibold leading-tight text-ink">{r.title}</span>
                  <span className="block truncate text-[12px] text-mute">{r.genre}</span>
                </span>
              </li>
            ))
          )}
          {results.length > 0 && (
            <li role="presentation" className="border-t border-line-soft">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(`/games?q=${encodeURIComponent(query.trim())}`)}
                className="label w-full px-3 py-2.5 text-left text-mute hover:text-ink"
              >
                Ver todos os resultados em Explorar
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
