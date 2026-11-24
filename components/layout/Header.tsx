"use client";

import { Menu, Settings2, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFavorites } from "@/hooks/useStore";
import { HeaderSearch, type SearchEntry } from "@/components/navigation/HeaderSearch";
import { NAV_ITEMS } from "@/components/navigation/nav-items";
import { Logo } from "@/components/ui/Logo";

export function Header({ entries }: { entries: SearchEntry[] }) {
  const pathname = usePathname();
  const favorites = useFavorites();
  // O menu fica "preso" à rota em que foi aberto: mudar de página o fecha sem efeito colateral.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const menuOpen = openFor === pathname;
  const setMenuOpen = (v: boolean | ((cur: boolean) => boolean)) => setOpenFor((cur) => ((typeof v === "function" ? v(cur === pathname) : v) ? pathname : null));
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Menu mobile: trava a rolagem, fecha com Esc, mantém o foco dentro e devolve ao botão.
  useEffect(() => {
    if (!menuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>('a[href], button, input, [tabindex]:not([tabindex="-1"])') ?? []);
    focusables()[0]?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenFor(null);
        toggleRef.current?.focus();
      } else if (e.key === "Tab") {
        const els = focusables();
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-base">
      <div className="mx-auto flex h-16 w-full max-w-[1360px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav aria-label="Principal" className="ml-4 hidden h-full items-stretch gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const current = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`relative flex items-center px-2 font-display text-[15px] xl:px-3 xl:text-[17px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                  current ? "text-ink" : "text-mute hover:text-ink"
                }`}
              >
                {item.label}
                {item.href === "/favoritos" && favorites.length > 0 && (
                  <span className="label ml-2 min-w-5 bg-accent px-1 text-center text-accent-ink" aria-label={`${favorites.length} favoritos`}>
                    {favorites.length}
                  </span>
                )}
                {current && <span aria-hidden="true" className="absolute inset-x-2 bottom-0 xl:inset-x-3 h-[3px] bg-accent" />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden w-full max-w-[180px] md:block lg:max-w-[190px] xl:max-w-[300px]">
          <HeaderSearch entries={entries} />
        </div>

        <Link
          href="/preferencias"
          aria-label="Preferências"
          title="Preferências"
          className="hidden h-10 w-10 place-items-center rounded-xs border border-transparent text-mute transition-colors hover:border-line hover:text-ink md:grid"
        >
          <Settings2 aria-hidden="true" className="h-[18px] w-[18px]" />
        </Link>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="menu-mobile"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          className="ml-auto grid h-10 w-10 place-items-center rounded-xs border border-line text-ink lg:hidden md:ml-0"
        >
          {menuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div
          id="menu-mobile"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-line bg-base lg:hidden"
        >
          <div className="mx-auto max-w-xl space-y-6 px-4 py-6 sm:px-6">
            <HeaderSearch entries={entries} onNavigate={() => setMenuOpen(false)} />
            <nav aria-label="Menu principal">
              <ul className="divide-y divide-line-soft border-y border-line-soft">
                {[...NAV_ITEMS, { href: "/preferencias", label: "Preferências", match: (p: string) => p.startsWith("/preferencias") }].map(
                  (item) => {
                    const current = item.match(pathname);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={current ? "page" : undefined}
                          className={`flex items-center justify-between py-4 font-display text-2xl font-semibold uppercase tracking-[0.06em] ${
                            current ? "text-accent" : "text-ink"
                          }`}
                        >
                          {item.label}
                          {item.href === "/favoritos" && favorites.length > 0 && (
                            <span className="label bg-accent px-1.5 py-0.5 text-accent-ink">{favorites.length}</span>
                          )}
                        </Link>
                      </li>
                    );
                  },
                )}
              </ul>
            </nav>
            <p className="label text-mute">Favoritos e histórico ficam salvos só neste navegador.</p>
          </div>
        </div>
      )}
    </header>
  );
}
