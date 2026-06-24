"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { apiClient } from "@/lib/api-client";
import { demoSongs } from "@/lib/demo-data";
import { useAuthStore } from "@/store/auth-store";
import type { Song } from "@/types/api";

const SONG_STATUS_LABELS: Record<string, string> = {
  uploaded: "subida",
  processing: "procesando",
  ready: "lista",
  failed: "fallida"
};

function translateSongStatus(status: string) {
  return SONG_STATUS_LABELS[status] ?? status;
}

export function SongLibrary() {
  const { token } = useAuthStore();
  const [songs, setSongs] = useState<Song[]>(demoSongs);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!token) {
      return;
    }
    apiClient.getSongs(token, query).then(setSongs).catch(() => undefined);
  }, [query, token]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/70">Biblioteca</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Tus canciones</h3>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por titulo o artista"
          className="w-full rounded-md border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/50 md:max-w-sm"
        />
      </div>

      <div className="space-y-3 md:hidden">
        {songs.map((song) => (
          <article key={song.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-white">{song.title}</p>
                <p className="mt-1 text-sm text-white/60">{song.artist ?? "Pendiente"}</p>
              </div>
              <StatusBadge label={song.status} displayLabel={translateSongStatus(song.status)} />
            </div>
            <div className="mt-4 flex items-center justify-end">
              <Link href={`/songs/${song.id}`} className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-black transition hover:bg-white/90">
                Abrir
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-white/10 shadow-panel md:block">
        <table className="min-w-[680px] bg-white/[0.04] text-sm">
          <thead className="bg-white/[0.04] text-white/45">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Titulo</th>
              <th className="px-4 py-3 text-left font-medium">Artista</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Accion</th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song) => (
              <tr key={song.id} className="border-t border-white/5 transition hover:bg-white/[0.04]">
                <td className="px-4 py-4 text-white">{song.title}</td>
                <td className="px-4 py-4 text-white/60">{song.artist ?? "Pendiente"}</td>
                <td className="px-4 py-4">
                  <StatusBadge label={song.status} displayLabel={translateSongStatus(song.status)} />
                </td>
                <td className="px-4 py-4">
                  <Link href={`/songs/${song.id}`} className="font-semibold text-emerald-200 transition hover:text-white">
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
