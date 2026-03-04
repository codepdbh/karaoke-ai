import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "karaoke-ai",
  description: "Local karaoke studio for stem separation, lyrics sync and playback."
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
