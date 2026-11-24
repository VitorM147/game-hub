import type { Metadata, Viewport } from "next";
import { PrefsApplier } from "@/components/ui/PrefsApplier";
import { ToastHost } from "@/components/ui/ToastHost";
import { BRAND } from "@/config/brand";
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
        {children}
        <ToastHost />
        <PrefsApplier />
      </body>
    </html>
  );
}
