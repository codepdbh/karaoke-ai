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

export function LyricsEditor({ versionId }: LyricsEditorProps) {
  const { token } = useAuthStore();
  const [songId, setSongId] = useState<number>(demoLyrics.song_id);
  const [lines, setLines] = useState<EditableLine[]>(demoLyrics.lines);
  const [versionName, setVersionName] = useState("Edited version");
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
      setMessage("You need an active session to save changes.");
      return;
    }
    try {
      const updated = await apiClient.updateLyricsVersion(token, versionId, {
        version_name: versionName,
        lines
      });
      setStatusLabel(updated.status);
      setMessage("Lyrics version saved.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not save lyrics version.");
    }
  };

  const saveNewVersion = async () => {
    if (!token) {
      setMessage("You need an active session to create a new version.");
      return;
    }
    try {
      const created = await apiClient.saveLyricsVersion(token, songId, {
        version_name: `${versionName} copy`,
        source_type: "manual",
        source_provider: "manual",
        status: "draft",
        lines
      });
      setMessage(`New version created as #${created.id}.`);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not create a new version.");
    }
  };

  const publishVersion = async () => {
    if (!token) {
      setMessage("You need an active session to publish.");
      return;
    }
    try {
      const updated = await apiClient.publishLyricsVersion(token, versionId);
      setStatusLabel(updated.status);
      setMessage("Lyrics version published.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Could not publish lyrics version.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Lyrics editor</p>
              <StatusBadge label={statusLabel} />
            </div>
            <h3 className="mt-3 text-3xl font-semibold text-white">Version #{versionId}</h3>
            <p className="mt-3 text-sm text-white/60">
              Song #{songId} | Total synced length {totalDuration.toFixed(2)} sec
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => applyOffset(-0.1)}
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/75 transition hover:bg-white/[0.04]"
            >
              Offset -0.10
            </button>
            <button
              onClick={() => applyOffset(0.1)}
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/75 transition hover:bg-white/[0.04]"
            >
              Offset +0.10
            </button>
            <button
              onClick={saveVersion}
              className="rounded-2xl bg-accent-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-accent-400"
            >
              Save changes
            </button>
            <button
              onClick={saveNewVersion}
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/80 transition hover:bg-white/[0.04]"
            >
              Save new version
            </button>
            <button
              onClick={publishVersion}
              className="rounded-2xl border border-neon-500/30 bg-neon-500/10 px-4 py-3 text-sm text-white transition hover:bg-neon-500/15"
            >
              Publish
            </button>
          </div>
        </div>
        {message ? <p className="mt-4 text-sm text-white/70">{message}</p> : null}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-white/40">
            Version name
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
          <div key={line.line_index} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr_0.6fr]">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-white/35">
                  Line text
                </span>
                <input
                  value={line.text}
                  onChange={(event) => updateLine(line.line_index, { text: event.target.value })}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.24em] text-white/35">
                  Start
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
                  End
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
