import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getAppBasePath, withAppBasePath } from "@/lib/runtime-urls";

import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://rutasingluten.lat";
const appBasePath = getAppBasePath();
const canonicalUrl = `${siteUrl}${appBasePath || ""}/`;
const ogImageUrl = `${siteUrl}${withAppBasePath("/logo.png")}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Karaoke IA",
  description: "Crea pistas karaoke, sincroniza letras y reproduce tus canciones desde el navegador.",
  alternates: {
    canonical: canonicalUrl
  },
  openGraph: {
    type: "website",
    url: canonicalUrl,
    title: "Karaoke IA",
    description: "Crea pistas karaoke, sincroniza letras y reproduce tus canciones desde el navegador.",
    siteName: "Karaoke IA",
    images: [
      {
        url: ogImageUrl,
        width: 1024,
        height: 1024,
        alt: "Logo de Karaoke IA"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Karaoke IA",
    description: "Crea pistas karaoke, sincroniza letras y reproduce tus canciones desde el navegador.",
    images: [ogImageUrl]
  },
  icons: {
    icon: withAppBasePath("/logo.png"),
    apple: withAppBasePath("/logo.png")
  }
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <div className="relative flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <footer className="relative z-10 border-t border-white/10 bg-black/20 px-6 py-4 text-center text-xs text-white/55 backdrop-blur">
            Desarrollado por Ing. Paulo Daniel Batuani Hurtado y Codex 5.3 - Un proyecto hecho con
            el Corazón {"<3"}
          </footer>
        </div>
      </body>
    </html>
  );
}
