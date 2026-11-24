"use client";

import { useSyncExternalStore } from "react";
import { getServerSnapshot, getSnapshot, subscribe, type StoreState } from "@/lib/store";

/** Lê uma fatia estável do estado local. O seletor NÃO deve criar objetos novos a cada chamada. */
export function useStore<T>(selector: (s: StoreState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getServerSnapshot()),
  );
}

export const useFavorites = () => useStore((s) => s.favorites);
export const useHistory = () => useStore((s) => s.history);
export const usePrefs = () => useStore((s) => s.prefs);
export const useIsFavorite = (slug: string) => useStore((s) => s.favorites.includes(slug));
