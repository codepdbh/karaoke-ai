"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { withAppBasePath } from "@/lib/runtime-urls";
import { useAuthStore } from "@/store/auth-store";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const items = [
    { href: "/dashboard", label: "Inicio" },
    { href: "/upload", label: "Subir cancion" },
    { href: "/search", label: "Buscar cancion" },
    { href: "/library", label: "Canciones" },
    { href: "/jobs", label: "Trabajos" },
    ...(user?.role === "admin" ? [{ href: "/admin/users", label: "Usuarios" }] : [])
  ];

  return (
    <aside className="w-full rounded-lg border border-white/10 bg-base-900/80 p-3 shadow-panel backdrop-blur md:max-w-[230px] md:shrink-0 md:self-start md:p-4">
      <div className="flex items-center gap-3">
        <Image
          src={withAppBasePath("/logo.png")}
          alt="Logo Karaoke AI"
          width={48}
          height={48}
          className="h-12 w-12 rounded-md object-cover"
          priority
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">karaoke-ai</p>
          <h1 className="truncate text-lg font-semibold text-white">Estudio</h1>
        </div>
      </div>

      <nav className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-1">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2.5 text-center text-sm font-medium transition md:text-left ${
                active
                  ? "bg-emerald-300 text-black"
                  : "text-white/70 hover:bg-white/[0.06] hover:text-white"
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
