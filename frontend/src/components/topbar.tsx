"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";

const PAGE_LABELS = [
  { match: "/admin/users", title: "Usuarios", subtitle: "Gestion de creditos y roles" },
  { match: "/upload", title: "Subir cancion", subtitle: "Agrega una pista al karaoke" },
  { match: "/search", title: "Buscar cancion", subtitle: "Busqueda e importacion autorizada" },
  { match: "/library", title: "Canciones", subtitle: "Biblioteca lista para cantar" },
  { match: "/jobs", title: "Trabajos", subtitle: "Procesos de audio y letras" },
  { match: "/player", title: "Cantar", subtitle: "Letras grandes y control simple" },
  { match: "/lyrics", title: "Letras", subtitle: "Ajusta tiempos y versiones" },
  { match: "/songs", title: "Cancion", subtitle: "Detalles y acciones" },
  { match: "/dashboard", title: "Inicio", subtitle: "Resumen del sistema" }
];

export function TopBar() {
  const pathname = usePathname();
  const { user, clearSession } = useAuthStore();
  const page = PAGE_LABELS.find((entry) => pathname.startsWith(entry.match)) ?? PAGE_LABELS[PAGE_LABELS.length - 1];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-base-900/60 p-4 shadow-panel sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">{page.subtitle}</p>
        <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">{page.title}</h2>
      </div>

      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
        <div className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/[0.18] px-3 py-2 text-left sm:flex-none sm:text-right">
          <p className="truncate text-sm font-medium text-white">{user?.username ?? "Invitado"}</p>
          <p className="mt-0.5 text-xs text-white/50">
            {user?.role === "admin" ? "Creditos ilimitados" : `Creditos: ${user?.credits_remaining ?? 0}`}
          </p>
        </div>
        <Link
          href="/login"
          onClick={() => clearSession()}
          className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90"
        >
          Salir
        </Link>
      </div>
    </div>
  );
}
