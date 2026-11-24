/**
 * Persistência local (localStorage) com assinatura reativa.
 * Sem dependências: usado via useSyncExternalStore em hooks/useStore.ts.
 * Tudo fica neste navegador; não há conta nem sincronização. O formato e a validação ficam em lib/state.ts.
 */

import { BRAND } from "@/config/brand";
import { pickStoredValue } from "@/lib/migrate";
import { DEFAULT_STATE, FAVORITES_LIMIT, HISTORY_LIMIT, sanitize, type HistoryEntry, type Prefs, type StoreState } from "@/lib/state";

export { DEFAULT_STATE };
export type { HistoryEntry, Prefs, StoreState };

const KEY = BRAND.storageKey;

let state: StoreState = DEFAULT_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const found = pickStoredValue(window.localStorage, KEY, BRAND.legacyStorageKeys);
    if (found) {
      state = sanitize(JSON.parse(found.raw));
      if (found.migrated) window.localStorage.setItem(KEY, JSON.stringify(state));
    }
  } catch {
    // Armazenamento bloqueado ou corrompido: segue com os padrões.
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try {
      state = e.newValue ? sanitize(JSON.parse(e.newValue)) : DEFAULT_STATE;
    } catch {
      state = DEFAULT_STATE;
    }
    emit();
  });
}

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: StoreState) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Sem espaço ou modo privado: a sessão continua funcionando em memória.
  }
  emit();
}

export function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): StoreState {
  load();
  return state;
}

export function getServerSnapshot(): StoreState {
  return DEFAULT_STATE;
}

/** Devolve true se o jogo passou a ser favorito. */
export function toggleFavorite(slug: string): boolean {
  load();
  const has = state.favorites.includes(slug);
  commit({ ...state, favorites: has ? state.favorites.filter((s) => s !== slug) : [slug, ...state.favorites].slice(0, FAVORITES_LIMIT) });
  return !has;
}

export function recordPlay(slug: string) {
  load();
  const prev = state.history.find((h) => h.slug === slug);
  const entry: HistoryEntry = { slug, lastPlayedAt: Date.now(), plays: (prev?.plays ?? 0) + 1 };
  commit({ ...state, history: [entry, ...state.history.filter((h) => h.slug !== slug)].slice(0, HISTORY_LIMIT) });
}

export function clearHistory() {
  load();
  commit({ ...state, history: [] });
}

export function removeHistoryItem(slug: string) {
  load();
  commit({ ...state, history: state.history.filter((h) => h.slug !== slug) });
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  load();
  commit({ ...state, prefs: { ...state.prefs, [key]: value } });
}

export function clearFavorites() {
  load();
  commit({ ...state, favorites: [] });
}

export function resetAll() {
  load();
  commit(DEFAULT_STATE);
}
