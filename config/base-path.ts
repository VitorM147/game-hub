/**
 * Prefixo de caminho quando o site roda numa subpasta (GitHub Pages de projeto: /nome-do-repo).
 * Em desenvolvimento e em hospedagem na raiz fica vazio. Definido por NEXT_PUBLIC_BASE_PATH no build.
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

/** Prefixa caminhos de arquivos estáticos (/games/..., /brand/...) que não passam pelo roteador do Next. */
export function withBase<T extends string | undefined>(url: T): T {
  if (!url || !url.startsWith("/") || url.startsWith("//") || (BASE_PATH && url.startsWith(BASE_PATH + "/"))) return url;
  return (BASE_PATH + url) as T;
}
