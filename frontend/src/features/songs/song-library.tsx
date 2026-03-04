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
    <div className="space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">Biblioteca</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Catalogo de canciones</h3>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por titulo o artista"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/25 md:max-w-sm"
        />
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="min-w-full bg-black/20 text-sm">
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
              <tr key={song.id} className="border-t border-white/5">
                <td className="px-4 py-4 text-white">{song.title}</td>
                <td className="px-4 py-4 text-white/65">{song.artist ?? "Pendiente"}</td>
                <td className="px-4 py-4">
                  <StatusBadge label={song.status} displayLabel={translateSongStatus(song.status)} />
                </td>
                <td className="px-4 py-4">
                  <Link href={`/songs/${song.id}`} className="text-accent-400 transition hover:text-accent-500">
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
