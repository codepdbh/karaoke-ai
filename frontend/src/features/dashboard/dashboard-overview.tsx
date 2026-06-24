"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { apiClient } from "@/lib/api-client";
import { demoJobs, demoSongs } from "@/lib/demo-data";
import { useAuthStore } from "@/store/auth-store";
import type { Job, Song } from "@/types/api";

export function DashboardOverview() {
  const { token, user } = useAuthStore();
  const [songs, setSongs] = useState<Song[]>(demoSongs);
  const [jobs, setJobs] = useState<Job[]>(demoJobs);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    const loadDashboard = () => {
      apiClient
        .getSongs(token)
        .then((nextSongs) => {
          if (active) {
            setSongs(nextSongs);
          }
        })
        .catch(() => undefined);

      apiClient
        .getJobs(token)
        .then((nextJobs) => {
          if (active) {
            setJobs(nextJobs);
          }
        })
        .catch(() => undefined);
    };

    loadDashboard();
    const interval = window.setInterval(loadDashboard, 3000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [token]);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/70">Inicio rapido</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Que quieres cantar hoy?</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
              Sube una pista nueva o abre tu biblioteca. Los detalles tecnicos quedan en segundo plano.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/upload"
              className="rounded-md bg-emerald-300 px-4 py-3 text-center text-sm font-semibold text-black transition hover:bg-emerald-200"
            >
              Subir cancion
            </Link>
            <Link
              href="/library"
              className="rounded-md border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white/80 transition hover:bg-white/[0.06]"
            >
              Ver canciones
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Creditos"
          value={user?.role === "admin" ? "∞" : String(user?.credits_remaining ?? 0)}
          hint="Disponibles para preparar canciones."
        />
        <StatCard label="Canciones" value={String(songs.length)} hint="Guardadas en tu biblioteca." />
        <StatCard label="Trabajos" value={String(jobs.length)} hint="Preparaciones recientes." />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-panel">
          <h3 className="text-lg font-semibold text-white">Canciones recientes</h3>
          <div className="mt-4 space-y-3">
            {songs.slice(0, 5).length === 0 ? (
              <p className="text-sm text-white/55">Aun no hay canciones. Sube la primera desde el boton de arriba.</p>
            ) : (
              songs.slice(0, 5).map((song) => (
                <Link
                  key={song.id}
                  href={`/songs/${song.id}`}
                  className="flex items-center justify-between gap-3 rounded-md bg-black/20 px-4 py-3 transition hover:bg-white/[0.06]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{song.title}</p>
                    <p className="text-xs text-white/45">{song.artist ?? "Artista pendiente"}</p>
                  </div>
                  <StatusBadge label={song.status} />
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-panel">
          <h3 className="text-lg font-semibold text-white">Trabajos recientes</h3>
          <div className="mt-4 space-y-3">
            {jobs.slice(0, 5).length === 0 ? (
              <p className="text-sm text-white/55">Cuando prepares una cancion, su avance aparecera aqui.</p>
            ) : (
              jobs.slice(0, 5).map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`} className="block rounded-md bg-black/20 px-4 py-3 transition hover:bg-white/[0.06]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">Trabajo #{job.id}</p>
                    <StatusBadge label={job.status} />
                  </div>
                  <p className="mt-2 text-xs text-white/45">{job.current_step ?? "pendiente"}</p>
                  <div className="mt-3 h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-emerald-300"
                      style={{ width: `${job.progress_percent}%` }}
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
