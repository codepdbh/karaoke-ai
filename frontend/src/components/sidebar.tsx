"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/library", label: "Library" },
  { href: "/jobs", label: "Jobs" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full max-w-[260px] rounded-[2rem] border border-white/10 bg-base-900/80 p-5 backdrop-blur">
      <div className="rounded-3xl bg-gradient-to-br from-accent-500/25 to-neon-500/10 p-5">
        <p className="text-xs uppercase tracking-[0.28em] text-white/45">karaoke-ai</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Studio</h1>
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

