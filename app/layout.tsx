import type { Metadata, Viewport } from "next";
import { PrefsApplier } from "@/components/ui/PrefsApplier";
import { ToastHost } from "@/components/ui/ToastHost";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Game Hub — jogue no navegador", template: "%s · Game Hub" },
  description:
    "Portal de jogos para descobrir, explorar e jogar títulos direto no navegador, quando compatíveis. Primeiro título: ORION — Protocolo RX-7.",
  openGraph: {
    type: "website",
    siteName: "Game Hub",
    locale: "pt_BR",
    images: [{ url: "/images/og-orion.jpg", width: 1200, height: 675, alt: "ORION — Protocolo RX-7" }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-motion="full">
      <body className="min-h-dvh">
        {children}
        <ToastHost />
        <PrefsApplier />
      </body>
    </html>
  );
}
