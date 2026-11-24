import type { Availability, Platform } from "@/types/game";

export const PLATFORM_LABEL: Record<Platform, string> = {
  web: "Navegador",
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

export const PLATFORM_SHORT: Record<Platform, string> = {
  web: "WEB",
  windows: "WIN",
  macos: "MAC",
  linux: "LNX",
};

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  web: "Jogue no navegador",
  download: "Somente download",
  unavailable: "Indisponível",
  "coming-soon": "Em breve",
};

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatSize(kb?: number): string | undefined {
  if (!kb) return undefined;
  return kb >= 1024 ? `${(kb / 1024).toFixed(1).replace(".", ",")} MB` : `${kb} KB`;
}

export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "agora há pouco";
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

/** Normaliza para busca: minúsculas e sem acentos. */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}
