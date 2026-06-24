"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { apiClient, ApiError } from "@/lib/api-client";
import { demoSongDetail } from "@/lib/demo-data";
import { useAuthStore } from "@/store/auth-store";
import type { LyricsVersion, SongDetail } from "@/types/api";

type SongDetailViewProps = {
  songId: string;
};

const SONG_STATUS_LABELS: Record<string, string> = {
  uploaded: "subida",
  processing: "procesando",
  ready: "lista",
  failed: "fallida"
};

const VERSION_STATUS_LABELS: Record<string, string> = {
  draft: "borrador",
  reviewed: "revisada",
  published: "publicada",
  deprecated: "obsoleta"
};

const VERSION_SOURCE_LABELS: Record<string, string> = {
  manual: "manual",
  external_reference: "referencia externa",
  local_transcription: "transcripcion local",
  merged: "fusionada"
};

const VERSION_PROVIDER_LABELS: Record<string, string> = {
  none: "ninguno",
  lrclib: "lrclib",
  manual: "manual",
  local: "local"
};

function translateSongStatus(status: string) {
  return SONG_STATUS_LABELS[status] ?? status;
}

function translateVersionStatus(status: string) {
  return VERSION_STATUS_LABELS[status] ?? status;
}

function translateVersionSource(source: string) {
  return VERSION_SOURCE_LABELS[source] ?? source;
}

function translateVersionProvider(provider: string) {
  return VERSION_PROVIDER_LABELS[provider] ?? provider;
}

function formatDate(dateValue: string | null | undefined) {
  if (!dateValue) {
    return "pendiente";
  }

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) {
    return dateValue;
  }

  return parsed.toLocaleString("es-BO", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

export function SongDetailView({ songId }: SongDetailViewProps) {
  const router = useRouter();
  const { token, user, setUser } = useAuthStore();
  const [song, setSong] = useState<SongDetail>(demoSongDetail);
  const [versions, setVersions] = useState<LyricsVersion[]>([]);
  const [converting, setConverting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | number | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    const refreshData = () => {
      apiClient.getSong(token, songId).then((data) => {
        if (active) setSong(data);
      }).catch(() => undefined);
      apiClient.getLyricsVersions(token, songId).then((data) => {
        if (active) setVersions(data);
      }).catch(() => undefined);
    };

    refreshData();

    let interval: NodeJS.Timeout | null = null;
    if (song.status === "processing") {
      interval = setInterval(refreshData, 3000);
    }

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [songId, token, song.status]);

  useEffect(() => {
    if (!token || song.status !== "processing") {
      return;
    }

    let active = true;
    const findActiveJob = async () => {
      try {
        const jobs = await apiClient.getJobs(token);
        if (!active) return;

        const runningJob = jobs.find(
          (j) => j.song_id === song.id && !["completed", "failed", "cancelled"].includes(j.status)
        );
        if (runningJob) {
          setActiveJobId(runningJob.id);
        } else {
          const matchedJob = jobs.find((j) => j.song_id === song.id);
          if (matchedJob) {
            setActiveJobId(matchedJob.id);
          }
        }
      } catch {
        // Ignore
      }
    };

    findActiveJob();
    const interval = setInterval(findActiveJob, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [token, song.status, song.id]);

  const convertSong = async () => {
    if (!token) {
      return;
    }

    setConverting(true);
    setMessage(null);

    try {
      const job = await apiClient.triggerSongProcess(token, songId);
      if (user && user.role !== "admin") {
        setUser({ ...user, credits_remaining: Math.max(0, user.credits_remaining - 1) });
      }
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "No se pudo iniciar la conversión.");
    } finally {
      setConverting(false);
    }
  };

  const canManageSong = user?.role === "admin" || user?.id === song.created_by;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Detalle de cancion</p>
              <StatusBadge label={song.status} displayLabel={translateSongStatus(song.status)} />
            </div>
            <h3 className="mt-3 break-words text-2xl font-semibold text-white sm:text-3xl">{song.title}</h3>
            <p className="mt-3 text-sm text-white/60">
              {song.artist ?? "Artista desconocido"} | {song.album ?? "Sin album"} |{" "}
              {song.language ?? "Idioma pendiente"}
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto">
            {song.status === "ready" ? (
              <Link
                href={`/player/${songId}`}
                className="w-full rounded-md bg-gradient-to-r from-emerald-300 via-lime-200 to-amber-300 px-6 py-4 text-center text-base font-black tracking-[0.08em] text-black shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_18px_48px_rgba(52,211,153,0.28)] transition hover:scale-[1.02] hover:brightness-110 sm:col-span-2 xl:min-w-[18rem]"
              >
                CANTA AHORA
              </Link>
            ) : song.status === "processing" ? (
              activeJobId ? (
                <Link
                  href={`/jobs/${activeJobId}`}
                  className="w-full rounded-md bg-yellow-500 px-6 py-4 text-center text-base font-bold tracking-[0.08em] text-black shadow-[0_0_0_1px_rgba(255,255,255,0.18)] transition hover:scale-[1.02] hover:brightness-110 sm:col-span-2 xl:min-w-[18rem]"
                >
                  VER PROGRESO DE CONVERSIÓN
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full rounded-md bg-yellow-500/50 px-6 py-4 text-center text-base font-bold tracking-[0.08em] text-white/50 cursor-not-allowed sm:col-span-2 xl:min-w-[18rem]"
                >
                  PROCESANDO KARAOKE...
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={convertSong}
                disabled={converting}
                className="w-full rounded-md bg-gradient-to-r from-emerald-300 via-lime-200 to-amber-300 px-6 py-4 text-center text-base font-black tracking-[0.08em] text-black shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_18px_48px_rgba(52,211,153,0.28)] transition hover:scale-[1.02] hover:brightness-110 disabled:scale-100 disabled:opacity-60 sm:col-span-2 xl:min-w-[18rem]"
              >
                {converting ? "INICIANDO..." : "CONVERTIR A KARAOKE AHORA"}
              </button>
            )}
            <Link
              href={versions[0] ? `/lyrics/${versions[0].id}` : "#"}
              className={`w-full rounded-md border border-white/10 px-4 py-3 text-center text-sm transition sm:col-span-2 ${
                versions[0]
                  ? "text-white/80 hover:bg-white/[0.04]"
                  : "cursor-not-allowed text-white/35"
              }`}
            >
              {canManageSong ? "Abrir editor" : "Ver letras"}
            </Link>
          </div>
        </div>
        {!canManageSong ? (
          <p className="mt-4 text-sm text-white/55">
            Puedes reproducir y consultar esta cancion, pero solo su propietario o un admin pueden modificarla.
          </p>
        ) : null}
        {message ? (
          <p className="mt-4 text-sm text-red-400 font-semibold">{message}</p>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h4 className="text-lg font-semibold text-white">Metadatos</h4>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-white/40">Duracion</dt>
              <dd className="mt-1 text-white/80">
                {song.duration_seconds ? `${song.duration_seconds} seg` : "pendiente"}
              </dd>
            </div>
            <div>
              <dt className="text-white/40">Huella de audio</dt>
              <dd className="mt-1 break-all text-white/80">{song.audio_fingerprint ?? "pendiente"}</dd>
            </div>
            <div>
              <dt className="text-white/40">Creada el</dt>
              <dd className="mt-1 text-white/80">{formatDate(song.created_at)}</dd>
            </div>
            <div>
              <dt className="text-white/40">Actualizada el</dt>
              <dd className="mt-1 text-white/80">{formatDate(song.updated_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h4 className="text-lg font-semibold text-white">Versiones de letra</h4>
          <div className="mt-4 space-y-3">
            {versions.length === 0 ? (
              <p className="text-sm text-white/55">
                Aun no hay versiones de letra para esta cancion.
              </p>
            ) : (
              versions.map((version) => (
                <Link
                  key={version.id}
                  href={`/lyrics/${version.id}`}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition hover:bg-black/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{version.version_name}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {translateVersionSource(version.source_type)} |{" "}
                      {translateVersionProvider(version.source_provider)}
                    </p>
                  </div>
                  <StatusBadge
                    label={version.status}
                    displayLabel={translateVersionStatus(version.status)}
                  />
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
