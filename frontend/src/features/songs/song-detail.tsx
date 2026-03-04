"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { apiClient, ApiError } from "@/lib/api-client";
import { demoSongDetail } from "@/lib/demo-data";
import { useAuthStore } from "@/store/auth-store";
import type { LyricsVersion, SongDetail } from "@/types/api";

type SongDetailViewProps = {
  songId: string;
};

export function SongDetailView({ songId }: SongDetailViewProps) {
  const { token } = useAuthStore();
  const [song, setSong] = useState<SongDetail>(demoSongDetail);
  const [versions, setVersions] = useState<LyricsVersion[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    apiClient.getSong(token, songId).then(setSong).catch(() => undefined);
    apiClient.getLyricsVersions(token, songId).then(setVersions).catch(() => undefined);
  }, [songId, token]);

  const triggerProcess = async () => {
    if (!token) {
      setStatusMessage("You need an active session to queue processing.");
      return;
    }
    try {
      const job = await apiClient.triggerSongProcess(token, songId);
      setStatusMessage(`Processing queued as job #${job.id}.`);
    } catch (error) {
      setStatusMessage(error instanceof ApiError ? error.message : "Could not queue processing.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Song detail</p>
              <StatusBadge label={song.status} />
            </div>
            <h3 className="mt-3 text-3xl font-semibold text-white">{song.title}</h3>
            <p className="mt-3 text-sm text-white/60">
              {song.artist ?? "Unknown artist"} | {song.album ?? "No album"} |{" "}
              {song.language ?? "Language pending"}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              onClick={triggerProcess}
              className="rounded-2xl bg-accent-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-accent-400"
            >
              Process
            </button>
            <Link
              href={`/player/${songId}`}
              className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-white/80 transition hover:bg-white/[0.04]"
            >
              Open player
            </Link>
            <Link
              href={versions[0] ? `/lyrics/${versions[0].id}` : "#"}
              className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-white/80 transition hover:bg-white/[0.04]"
            >
              Open editor
            </Link>
          </div>
        </div>
        {statusMessage ? <p className="mt-4 text-sm text-white/70">{statusMessage}</p> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h4 className="text-lg font-semibold text-white">Metadata</h4>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-white/40">Duration</dt>
              <dd className="mt-1 text-white/80">{song.duration_seconds ?? 0} sec</dd>
            </div>
            <div>
              <dt className="text-white/40">Fingerprint</dt>
              <dd className="mt-1 break-all text-white/80">{song.audio_fingerprint ?? "Pending"}</dd>
            </div>
            <div>
              <dt className="text-white/40">Created at</dt>
              <dd className="mt-1 text-white/80">{song.created_at}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h4 className="text-lg font-semibold text-white">Available files</h4>
            <div className="mt-4 space-y-3">
              {song.files.map((file) => (
                <div key={file.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-sm font-medium text-white">{file.file_type}</p>
                  <p className="mt-1 break-all text-xs text-white/45">{file.storage_path}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h4 className="text-lg font-semibold text-white">Lyrics versions</h4>
            <div className="mt-4 space-y-3">
              {versions.length === 0 ? (
                <p className="text-sm text-white/55">No versions yet. Queue processing or add one manually.</p>
              ) : (
                versions.map((version) => (
                  <Link
                    key={version.id}
                    href={`/lyrics/${version.id}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3 transition hover:bg-black/30"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{version.version_name}</p>
                      <p className="mt-1 text-xs text-white/45">
                        {version.source_type} | {version.source_provider}
                      </p>
                    </div>
                    <StatusBadge label={version.status} />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
