"use client";

import { useEffect } from "react";
import { usePrefs } from "@/hooks/useStore";

/** Aplica no <html> as preferências locais que afetam a aparência. */
export function PrefsApplier() {
  const prefs = usePrefs();
  useEffect(() => {
    document.documentElement.dataset.motion = prefs.reduceMotion ? "reduced" : "full";
  }, [prefs.reduceMotion]);
  return null;
}
