import type { Metadata, Viewport } from "next";
import { PrefsApplier } from "@/components/ui/PrefsApplier";
import { ToastHost } from "@/components/ui/ToastHost";
import { BRAND } from "@/config/brand";
import { CSP } from "@/config/csp";
import "./globals.css";


export const metadata: Metadata = {
  metadataBase: new URL(BRAND.siteUrl),
  applicationName: BRAND.name,
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    locale: BRAND.locale,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    images: [{ url: BRAND.ogImage, width: 1200, height: 630, alt: `${BRAND.name} — ${BRAND.tagline}` }],
  },
  twitter: { card: "summary_large_image", title: BRAND.name, description: BRAND.description, images: [BRAND.ogImage] },
};

export const viewport: Viewport = {
  themeColor: BRAND.themeColor,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-motion="full">
      <head>
        {process.env.NODE_ENV === "production" && <meta httpEquiv="Content-Security-Policy" content={CSP} />}
        <meta name="referrer" content="strict-origin-when-cross-origin" />
      </head>
      <body className="min-h-dvh">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: BRAND.name,
              url: BRAND.siteUrl,
              description: BRAND.description,
              inLanguage: "pt-BR",
              potentialAction: { "@type": "SearchAction", target: `${BRAND.siteUrl}/games?q={search_term_string}`, "query-input": "required name=search_term_string" },
            }).replace(/</g, "\\u003c"),
          }}
        />
        <noscript>
          <p style={{ padding: 16, color: "#f3f5f7", background: "#151922" }}>
            A JoyStation precisa de JavaScript para listar e abrir os jogos no navegador.
          </p>
        </noscript>
        {children}
        <ToastHost />
        <PrefsApplier />
      </body>
    </html>
  );
}
