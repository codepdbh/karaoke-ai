"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Panel" },
  { href: "/upload", label: "Subir" },
  { href: "/library", label: "Biblioteca" },
  { href: "/jobs", label: "Procesos" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full max-w-[260px] rounded-[2rem] border border-white/10 bg-base-900/80 p-5 backdrop-blur">
      <div className="rounded-3xl bg-gradient-to-br from-accent-500/25 to-neon-500/10 p-5">
        <div className="relative inline-flex items-center justify-center rounded-2xl border border-white/25 bg-black/45 p-3 shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_0_34px_rgba(34,211,238,0.24)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_32%_24%,rgba(34,211,238,0.3),transparent_58%),radial-gradient(circle_at_76%_78%,rgba(249,115,22,0.26),transparent_62%)]" />
          <Image
            src="/logo.png"
            alt="Logo Karaoke AI"
            width={76}
            height={76}
            className="relative h-[76px] w-[76px] rounded-xl object-cover"
            priority
          />
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.28em] text-white/45">karaoke-ai</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Estudio</h1>
        <p className="mt-2 text-sm text-white/60">Procesa, sincroniza y reproduce karaoke local.</p>
      </div>

      <nav className="mt-8 space-y-2">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-2xl px-4 py-3 text-sm transition ${
                active
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
