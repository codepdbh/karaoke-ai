"use client";

import Link from "next/link";

import { useAuthStore } from "@/store/auth-store";

export function TopBar() {
  const { user, clearSession } = useAuthStore();

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-base-900/60 p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-white/40">Control Room</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Karaoke workflow</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-white/10 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-white/35">Session</p>
          <p className="mt-1 text-sm text-white">{user?.username ?? "Demo User"}</p>
        </div>
        <Link
          href="/login"
          onClick={() => clearSession()}
          className="rounded-2xl bg-accent-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-accent-400"
        >
          Logout
        </Link>
      </div>
    </div>
  );
}

