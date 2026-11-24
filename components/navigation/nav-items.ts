export const NAV_ITEMS = [
  { href: "/", label: "Início", match: (p: string) => p === "/" },
  { href: "/games", label: "Explorar jogos", match: (p: string) => p.startsWith("/games") },
  { href: "/categorias", label: "Categorias", match: (p: string) => p.startsWith("/categorias") },
  { href: "/novidades", label: "Novidades", match: (p: string) => p.startsWith("/novidades") },
  { href: "/favoritos", label: "Favoritos", match: (p: string) => p.startsWith("/favoritos") },
] as const;
