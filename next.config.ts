import type { NextConfig } from "next";

/**
 * Dois modos:
 * - padrão (`npm run build && npm start`): servidor Node, com cabeçalhos de segurança e cache.
 * - estático (`STATIC_EXPORT=1`): gera a pasta `out/` para GitHub Pages. Pages não permite cabeçalhos HTTP próprios,
 *   então `headers()` não existe nesse modo (veja docs/DEPLOY-GITHUB-PAGES.md).
 */
const isExport = process.env.STATIC_EXPORT === "1";
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  ...(isExport ? { output: "export" as const, trailingSlash: true } : {}),
  ...(basePath ? { basePath } : {}),
  images: isExport ? { unoptimized: true } : { formats: ["image/avif", "image/webp"] },
  ...(isExport
    ? {}
    : {
        async headers() {
          const security = [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "X-Frame-Options", value: "SAMEORIGIN" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          ];
          return [
            { source: "/:path*", headers: security },
            {
              // Arquivos do jogo e imagens mudam raramente: cache longo, revalidação barata.
              source: "/games/:path*",
              headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }],
            },
          ];
        },
      }),
};

export default nextConfig;
