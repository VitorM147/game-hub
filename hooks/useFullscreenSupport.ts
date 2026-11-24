"use client";

import { useSyncExternalStore } from "react";

/** true quando o navegador permite tela cheia (falso no servidor e em iframes sem permissão). */
export function useFullscreenSupport(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => document.fullscreenEnabled === true,
    () => false,
  );
}
