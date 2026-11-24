/** Fonte única da identidade JoyStation. Troque aqui, não espalhe strings pelo código. */
export const BRAND = {
  name: "JoyStation",
  tagline: "Seu mundo. Seus jogos.",
  description:
    "Plataforma gamer para descobrir, jogar e acompanhar jogos independentes direto no navegador, sem cadastro. Seus favoritos e seu histórico ficam salvos neste aparelho.",
  /** Nome da plataforma de publicação de jogos de terceiros/autorais. */
  developersName: "JoyStation Developers",
  repository: "https://github.com/VitorM147/joystation",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "pt_BR",
  themeColor: "#0b0d12",
  ogImage: "/brand/og-image.jpg",
  /** Chave atual e chaves antigas do armazenamento local (migradas no primeiro acesso). */
  storageKey: "joystation:v1",
  legacyStorageKeys: ["gamehub:v1"],
} as const;
