/** Tipos do catálogo. Tudo que é exibido ao jogador nasce destes metadados. */

export type CategoryId =
  | "acao"
  | "aventura"
  | "arcade"
  | "puzzle"
  | "estrategia"
  | "corrida"
  | "rpg"
  | "plataforma"
  | "narrativo"
  | "indie";

/** `web` = roda no navegador; os demais são builds para instalar. */
export type Platform = "web" | "windows" | "macos" | "linux";

/** Como o jogo é aberto pela plataforma. */
export type LaunchMode = "web" | "download" | "external";

/** Estado editorial no catálogo (não é o mesmo que a disponibilidade técnica). */
export type PublicationStatus = "published" | "coming-soon" | "hidden";

/**
 * Disponibilidade REAL, calculada no build a partir dos arquivos existentes
 * em /public (ver lib/catalog.ts). Nunca é declarada à mão.
 */
export type Availability = "web" | "download" | "unavailable" | "coming-soon";

export interface ImageAsset {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
}

export interface ControlBinding {
  /** Teclas que disparam a ação. Cada item vira uma tecla desenhada na UI. */
  keys: string[];
  action: string;
}

export interface Credit {
  name: string;
  role: string;
}

export interface Game {
  id: string;
  slug: string;
  title: string;
  alternateTitle?: string;
  tagline?: string;
  description: string;
  story: string[];
  objectives: string[];
  highlights?: string[];
  /** Mecânicas principais (ex.: "Desviar de obstáculos"). Aparece na página do jogo. */
  mechanics?: string[];
  controls: ControlBinding[];

  coverImage: ImageAsset;
  screenshots: ImageAsset[];
  /** Só preencher com um trailer real. Sem trailer, a UI simplesmente não mostra a seção. */
  trailerUrl?: string;

  genre: string;
  categories: CategoryId[];
  tags: string[];
  platforms: Platform[];
  technologies: string[];
  requirements?: string[];

  launchMode: LaunchMode;
  /** Entrada da versão web (HTML). Só vale se o arquivo existir em /public. */
  playableUrl?: string;
  downloadUrl?: string;
  repositoryUrl?: string;

  input: { keyboard: boolean; touch: "untested" | "supported" | "unsupported" };
  /** Proporção nativa da tela do jogo, para o player. */
  aspect: { width: number; height: number };

  /** ISO (AAAA-MM-DD). */
  releaseDate: string;
  /** Quem criou o jogo, quando não for o grupo da plataforma (títulos de terceiros). */
  developer?: string;
  /** Aviso editorial exibido junto ao jogo (ex.: título de terceiros que ainda não roda aqui). */
  notice?: string;
  /** Conteúdo só informativo (notícia/radar): fica fora do catálogo jogável, sem jogar nem baixar. */
  editorial?: boolean;
  status: PublicationStatus;
  credits: Credit[];
}

/** Jogo + o que só se sabe no build (arquivos presentes). */
export interface CatalogGame extends Game {
  availability: Availability;
  /** `platforms` já descontando `web` quando não há build web. */
  effectivePlatforms: Platform[];
  downloadSizeKB?: number;
}

export interface Category {
  id: CategoryId;
  label: string;
  short: string;
  description: string;
}
