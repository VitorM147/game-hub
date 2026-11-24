/**
 * Content-Security-Policy do portal. Entra como <meta http-equiv> porque o GitHub Pages não permite cabeçalhos próprios.
 * 'unsafe-inline' é necessário para os scripts de hidratação do Next e para os jogos inline; não há eval nem origens externas.
 * Observação: `frame-ancestors` não funciona em <meta>; a proteção contra clickjacking depende do host (ver SECURITY.md).
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
