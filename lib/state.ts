/**
 * Formato e validação do estado local (favoritos, histórico, preferências).
 * Sem dependências de navegador nem de alias, para poder ser testado com `node --test`.
 * Tudo que vem do localStorage é tratado como entrada não confiável.
 */

export interface HistoryEntry {
  slug: string;
  lastPlayedAt: number;
  plays: number;
}

export interface Prefs {
  reduceMotion: boolean;
  showControlsHint: boolean;
  compactGrid: boolean;
}

export interface StoreState {
  favorites: string[];
  history: HistoryEntry[];
  prefs: Prefs;
}

export const HISTORY_LIMIT = 24;
export const FAVORITES_LIMIT = 200;
const MAX_PLAYS = 1_000_000;
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

export const DEFAULT_STATE: StoreState = {
  favorites: [],
  history: [],
  prefs: { reduceMotion: false, showControlsHint: true, compactGrid: false },
};

export const isSlug = (x: unknown): x is string => typeof x === "string" && SLUG.test(x);

export function sanitize(raw: unknown): StoreState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const favorites = Array.isArray(r.favorites) ? r.favorites.filter(isSlug) : [];
  const history = Array.isArray(r.history)
    ? r.history
        .filter((h): h is HistoryEntry => {
          const e = h as HistoryEntry;
          return !!e && isSlug(e.slug) && typeof e.lastPlayedAt === "number" && Number.isFinite(e.lastPlayedAt);
        })
        .map((h) => ({
          slug: h.slug,
          lastPlayedAt: h.lastPlayedAt,
          plays: Number.isFinite(Number(h.plays)) && Number(h.plays) > 0 ? Math.min(Math.floor(Number(h.plays)), MAX_PLAYS) : 1,
        }))
    : [];
  // Sem slugs repetidos no histórico: vale a entrada mais recente.
  const seen = new Set<string>();
  const uniqueHistory = history
    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
    .filter((h) => (seen.has(h.slug) ? false : (seen.add(h.slug), true)));
  const p = (r.prefs && typeof r.prefs === "object" ? r.prefs : {}) as Partial<Prefs>;
  return {
    favorites: [...new Set(favorites)].slice(0, FAVORITES_LIMIT),
    history: uniqueHistory.slice(0, HISTORY_LIMIT),
    prefs: {
      reduceMotion: typeof p.reduceMotion === "boolean" ? p.reduceMotion : DEFAULT_STATE.prefs.reduceMotion,
      showControlsHint: typeof p.showControlsHint === "boolean" ? p.showControlsHint : DEFAULT_STATE.prefs.showControlsHint,
      compactGrid: typeof p.compactGrid === "boolean" ? p.compactGrid : DEFAULT_STATE.prefs.compactGrid,
    },
  };
}
