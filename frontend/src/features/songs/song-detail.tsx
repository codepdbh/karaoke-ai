"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  const { token } = useAuthStore();
  const [song, setSong] = useState<SongDetail>(demoSongDetail);
  const [versions, setVersions] = useState<LyricsVersion[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [queueing, setQueueing] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    apiClient.getSong(token, songId).then(setSong).catch(() => undefined);
    apiClient.getLyricsVersions(token, songId).then(setVersions).catch(() => undefined);
  }, [songId, token]);

  const processButtonLabel = useMemo(() => {
    if (queueing || song.status === "processing") {
      return "Procesando...";
    }
    if (song.status === "ready") {
      return "Reprocesar";
    }
    return "Procesar";
  }, [queueing, song.status]);

  const triggerProcess = async () => {
    if (!token) {
      setStatusMessage("Necesitas una sesion activa para lanzar el procesamiento.");
      return;
    }

    if (song.status === "processing") {
      setStatusMessage("Esta cancion ya esta en proceso. Espera a que termine el job actual.");
      return;
    }

    setQueueing(true);
    setStatusMessage(null);

    try {
      const job = await apiClient.triggerSongProcess(token, songId);
      setSong((current) => ({ ...current, status: "processing" }));
      setStatusMessage(`Proceso encolado como trabajo #${job.id}.`);
    } catch (error) {
      setStatusMessage(
        error instanceof ApiError ? error.message : "No se pudo encolar el procesamiento."
      );
    } finally {
      setQueueing(false);
    }
  };

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
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-3">
            <button
              onClick={triggerProcess}
              disabled={queueing || song.status === "processing"}
              className="w-full rounded-2xl bg-accent-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {processButtonLabel}
            </button>
            <Link
              href={`/player/${songId}`}
              className="w-full rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-white/80 transition hover:bg-white/[0.04]"
            >
              Abrir reproductor
            </Link>
            <Link
              href={versions[0] ? `/lyrics/${versions[0].id}` : "#"}
              className={`w-full rounded-2xl border border-white/10 px-4 py-3 text-center text-sm transition ${
                versions[0]
                  ? "text-white/80 hover:bg-white/[0.04]"
                  : "cursor-not-allowed text-white/35"
              }`}
            >
              Abrir editor
            </Link>
          </div>
        </div>
        {statusMessage ? <p className="mt-4 text-sm text-white/70">{statusMessage}</p> : null}
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
                Aun no hay versiones. Procesa la cancion o crea una version manual.
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
