"use client";

import { useEffect, useState } from "react";

import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { apiClient } from "@/lib/api-client";
import { demoJobs, demoSongs } from "@/lib/demo-data";
import { useAuthStore } from "@/store/auth-store";
import type { Job, Song } from "@/types/api";

export function DashboardOverview() {
  const { token } = useAuthStore();
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
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Canciones" value={String(songs.length)} hint="Biblioteca lista para procesar." />
        <StatCard label="Procesos" value={String(jobs.length)} hint="Ejecuciones recientes y en cola." />
        <StatCard
          label="Listas"
          value={String(songs.filter((song) => song.status === "ready").length)}
          hint="Canciones listas para karaoke."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-lg font-semibold text-white">Canciones recientes</h3>
          <div className="mt-4 space-y-3">
            {songs.slice(0, 5).map((song) => (
              <div key={song.id} className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{song.title}</p>
                  <p className="text-xs text-white/45">{song.artist ?? "Artista pendiente"}</p>
                </div>
                <StatusBadge label={song.status} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-lg font-semibold text-white">Jobs recientes</h3>
          <div className="mt-4 space-y-3">
            {jobs.slice(0, 5).map((job) => (
              <div key={job.id} className="rounded-2xl bg-black/20 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white">Trabajo #{job.id}</p>
                  <StatusBadge label={job.status} />
                </div>
                <p className="mt-2 text-xs text-white/45">{job.current_step ?? "pendiente"}</p>
                <div className="mt-3 h-2 rounded-full bg-white/5">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-accent-500 to-neon-500"
                    style={{ width: `${job.progress_percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
