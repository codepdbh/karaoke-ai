"use client";

import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { apiClient, ApiError } from "@/lib/api-client";
import { demoLyrics } from "@/lib/demo-data";
import { useAuthStore } from "@/store/auth-store";

type EditableWord = {
  word_index: number;
  text: string;
  start: number;
  end: number;
  confidence?: number | null;
};

type EditableLine = {
  line_index: number;
  text: string;
  start: number;
  end: number;
  confidence?: number | null;
  words: EditableWord[];
};

type LyricsEditorProps = {
  versionId: string;
};

const LYRICS_STATUS_LABELS: Record<string, string> = {
  draft: "borrador",
  reviewed: "revisada",
  published: "publicada",
  deprecated: "obsoleta"
};

function translateLyricsStatus(status: string) {
  return LYRICS_STATUS_LABELS[status] ?? status;
}

export function LyricsEditor({ versionId }: LyricsEditorProps) {
  const { token } = useAuthStore();
  const [songId, setSongId] = useState<number>(demoLyrics.song_id);
  const [lines, setLines] = useState<EditableLine[]>(demoLyrics.lines);
  const [versionName, setVersionName] = useState("Version editada");
  const [statusLabel, setStatusLabel] = useState("draft");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }
    apiClient
      .getLyricsVersion(token, versionId)
      .then((version) => {
        setSongId(version.song_id);
        setVersionName(version.version_name);
        setStatusLabel(version.status);
        setLines(
          version.lines
            .sort((left, right) => left.line_index - right.line_index)
            .map((line) => ({
              line_index: line.line_index,
              text: line.text,
              start: line.start_time ?? 0,
              end: line.end_time ?? 0,
              confidence: line.confidence_score,
              words: line.words
                .sort((left, right) => left.word_index - right.word_index)
                .map((word) => ({
                  word_index: word.word_index,
                  text: word.word,
                  start: word.start_time ?? 0,
                  end: word.end_time ?? 0,
                  confidence: word.confidence_score
                }))
            }))
        );
      })
      .catch(() => undefined);
  }, [token, versionId]);

  const totalDuration = useMemo(() => lines.reduce((max, line) => Math.max(max, line.end), 0), [lines]);

  const updateLine = (index: number, patch: Partial<EditableLine>) => {
    setLines((current) =>
      current.map((line) => (line.line_index === index ? { ...line, ...patch } : line))
    );
  };

  const applyOffset = (delta: number) => {
    setLines((current) =>
      current.map((line) => ({
        ...line,
        start: Number(Math.max(0, line.start + delta).toFixed(2)),
        end: Number(Math.max(0, line.end + delta).toFixed(2)),
        words: line.words.map((word) => ({
          ...word,
          start: Number(Math.max(0, word.start + delta).toFixed(2)),
          end: Number(Math.max(0, word.end + delta).toFixed(2))
        }))
      }))
    );
  };

  const saveVersion = async () => {
    if (!token) {
      setMessage("Necesitas una sesion activa para guardar cambios.");
      return;
    }
    try {
      const updated = await apiClient.updateLyricsVersion(token, versionId, {
        version_name: versionName,
        lines
      });
      setStatusLabel(updated.status);
      setMessage("Version de letra guardada.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "No se pudo guardar la version.");
    }
  };

  const saveNewVersion = async () => {
    if (!token) {
      setMessage("Necesitas una sesion activa para crear una nueva version.");
      return;
    }
    try {
      const created = await apiClient.saveLyricsVersion(token, songId, {
        version_name: `${versionName} copia`,
        source_type: "manual",
        source_provider: "manual",
        status: "draft",
        lines
      });
      setMessage(`Nueva version creada como #${created.id}.`);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "No se pudo crear una nueva version.");
    }
  };

  const publishVersion = async () => {
    if (!token) {
      setMessage("Necesitas una sesion activa para publicar.");
      return;
    }
    try {
      const updated = await apiClient.publishLyricsVersion(token, versionId);
      setStatusLabel(updated.status);
      setMessage("Version de letra publicada.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "No se pudo publicar la version.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Editor de letras</p>
              <StatusBadge
                label={statusLabel}
                displayLabel={translateLyricsStatus(statusLabel)}
              />
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Version #{versionId}</h3>
            <p className="mt-3 text-sm text-white/60">
              Cancion #{songId} | Largo total sincronizado {totalDuration.toFixed(2)} seg
            </p>
          </div>
          <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
            <button
              onClick={() => applyOffset(-0.1)}
              className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/75 transition hover:bg-white/[0.04] sm:w-auto"
            >
              Offset -0.10
            </button>
            <button
              onClick={() => applyOffset(0.1)}
              className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/75 transition hover:bg-white/[0.04] sm:w-auto"
            >
              Offset +0.10
            </button>
            <button
              onClick={saveVersion}
              className="w-full rounded-2xl bg-accent-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-accent-400 sm:w-auto"
            >
              Guardar cambios
            </button>
            <button
              onClick={saveNewVersion}
              className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/80 transition hover:bg-white/[0.04] sm:w-auto"
            >
              Guardar como nueva version
            </button>
            <button
              onClick={publishVersion}
              className="w-full rounded-2xl border border-neon-500/30 bg-neon-500/10 px-4 py-3 text-sm text-white transition hover:bg-neon-500/15 sm:w-auto"
            >
              Publicar
            </button>
          </div>
        </div>
        {message ? <p className="mt-4 text-sm text-white/70">{message}</p> : null}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-white/40">
            Nombre de version
          </span>
          <input
            value={versionName}
            onChange={(event) => setVersionName(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
          />
        </label>
      </section>

      <section className="space-y-4">
        {lines.map((line) => (
          <div key={line.line_index} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr_0.6fr]">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-white/35">
                  Texto de la linea
                </span>
                <input
                  value={line.text}
                  onChange={(event) => updateLine(line.line_index, { text: event.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-white/35">
                  Inicio
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={line.start}
                  onChange={(event) =>
                    updateLine(line.line_index, { start: Number(event.target.value) || 0 })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-white/35">
                  Fin
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={line.end}
                  onChange={(event) =>
                    updateLine(line.line_index, { end: Number(event.target.value) || 0 })
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {line.words.map((word) => (
                <span
                  key={`${line.line_index}-${word.word_index}`}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60"
                >
                  {word.text} ({word.start.toFixed(2)}-{word.end.toFixed(2)})
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
