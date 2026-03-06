"use client";

import Link from "next/link";

import { useAuthStore } from "@/store/auth-store";

export function TopBar() {
  const { user, clearSession } = useAuthStore();

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-base-900/60 p-4 sm:p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/40">Sala de control</p>
        <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl">Flujo de karaoke</h2>
      </div>

      <div className="flex w-full flex-wrap items-center gap-3 md:w-auto md:justify-end">
        <div className="min-w-0 flex-1 rounded-2xl border border-white/10 px-4 py-3 text-left sm:text-right md:flex-none">
          <p className="text-xs uppercase tracking-[0.24em] text-white/35">Sesion</p>
          <p className="mt-1 truncate text-sm text-white">{user?.username ?? "Invitado"}</p>
        </div>
        <Link
          href="/login"
          onClick={() => clearSession()}
          className="ml-auto rounded-2xl bg-accent-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-accent-400"
        >
          Salir
        </Link>
      </div>
    </div>
  );
}
