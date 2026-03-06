"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "@/lib/api-client";
import { demoLyrics } from "@/lib/demo-data";
import { useAuthStore } from "@/store/auth-store";
import type { LyricsPayload, SongDetail } from "@/types/api";

type StemTrack = "original" | "instrumental" | "vocals";
type PlaybackMode = "mix" | StemTrack;

type AudioSources = Record<StemTrack, string | null>;

type KaraokePlayerProps = {
  songId: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const EMPTY_AUDIO_SOURCES: AudioSources = {
  original: null,
  instrumental: null,
  vocals: null
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function KaraokePlayer({ songId }: KaraokePlayerProps) {
  const { token } = useAuthStore();
  const [lyrics, setLyrics] = useState<LyricsPayload>(demoLyrics);
  const [songDetail, setSongDetail] = useState<SongDetail | null>(null);
  const [audioSources, setAudioSources] = useState<AudioSources>(EMPTY_AUDIO_SOURCES);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("mix");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [vocalVolume, setVocalVolume] = useState(1);
  const [instrumentalVolume, setInstrumentalVolume] = useState(1);

  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const instrumentalAudioRef = useRef<HTMLAudioElement | null>(null);
  const vocalAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlsRef = useRef<AudioSources>(EMPTY_AUDIO_SOURCES);
  const lyricsViewportRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const activeLineIndex = useMemo(
    () =>
      lyrics.lines.findIndex((line) => currentTime >= line.start && currentTime <= (line.end || line.start + 1)),
    [currentTime, lyrics.lines]
  );

  const getTrackElement = (track: StemTrack) => {
    if (track === "original") {
      return originalAudioRef.current;
    }
    if (track === "instrumental") {
      return instrumentalAudioRef.current;
    }
    return vocalAudioRef.current;
  };

  const getActiveAudioElements = (mode: PlaybackMode) => {
    if (mode === "mix") {
      return [instrumentalAudioRef.current, vocalAudioRef.current].filter(
        (audio): audio is HTMLAudioElement => Boolean(audio)
      );
    }
    return [getTrackElement(mode)].filter((audio): audio is HTMLAudioElement => Boolean(audio));
  };

  const getPrimaryAudioElement = (mode: PlaybackMode) => {
    if (mode === "original") {
      return originalAudioRef.current;
    }
    if (mode === "vocals") {
      return vocalAudioRef.current;
    }
    return instrumentalAudioRef.current ?? vocalAudioRef.current;
  };

  const revokeAudioSources = (sources: AudioSources) => {
    (Object.values(sources) as Array<string | null>).forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    apiClient.getLyrics(token, songId).then(setLyrics).catch(() => undefined);
  }, [songId, token]);

  useEffect(() => {
    if (!token) {
      setSongDetail(null);
      return;
    }

    apiClient.getSong(token, songId).then(setSongDetail).catch(() => undefined);
  }, [songId, token]);

  useEffect(() => {
    const title = songDetail?.title?.trim();
    document.title = title ? `${title} - Karaoke AI` : "Karaoke AI";
  }, [songDetail?.title]);

  useEffect(() => {
    if (!token) {
      revokeAudioSources(audioUrlsRef.current);
      audioUrlsRef.current = EMPTY_AUDIO_SOURCES;
      setAudioSources(EMPTY_AUDIO_SOURCES);
      setIsPlaying(false);
      setCurrentTime(0);
      return;
    }

    let active = true;

    const loadTrack = async (track: StemTrack) => {
      const response = await fetch(`${API_BASE_URL}/api/v1/songs/${songId}/stream/${track}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Could not load ${track} stream.`);
      }

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    };

    const loadSources = async () => {
      const settled = await Promise.allSettled(
        (["original", "instrumental", "vocals"] as StemTrack[]).map(async (track) => [track, await loadTrack(track)] as const)
      );

      const nextSources = settled.reduce<AudioSources>((accumulator, result) => {
        if (result.status === "fulfilled") {
          const [track, url] = result.value;
          accumulator[track] = url;
        }
        return accumulator;
      }, { ...EMPTY_AUDIO_SOURCES });

      if (!active) {
        revokeAudioSources(nextSources);
        return;
      }

      revokeAudioSources(audioUrlsRef.current);
      audioUrlsRef.current = nextSources;
      setAudioSources(nextSources);
    };

    loadSources().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [songId, token]);

  useEffect(
    () => () => {
      revokeAudioSources(audioUrlsRef.current);
    },
    []
  );

  useEffect(() => {
    if (vocalAudioRef.current) {
      vocalAudioRef.current.volume = vocalVolume;
    }
    if (instrumentalAudioRef.current) {
      instrumentalAudioRef.current.volume = instrumentalVolume;
    }
    if (originalAudioRef.current) {
      originalAudioRef.current.volume = 1;
    }
  }, [instrumentalVolume, vocalVolume]);

  useEffect(() => {
    const activeAudio = getActiveAudioElements(playbackMode);
    const inactiveAudio = ([
      originalAudioRef.current,
      instrumentalAudioRef.current,
      vocalAudioRef.current
    ] as Array<HTMLAudioElement | null>).filter(
      (audio): audio is HTMLAudioElement => {
        if (!audio) {
          return false;
        }

        return !activeAudio.includes(audio);
      }
    );

    inactiveAudio.forEach((audio) => {
      audio.pause();
    });

    activeAudio.forEach((audio) => {
      if (audio.readyState > 0 && Math.abs(audio.currentTime - currentTime) > 0.18) {
        audio.currentTime = currentTime;
      }
    });

    const primaryAudio = getPrimaryAudioElement(playbackMode);
    if (primaryAudio && Number.isFinite(primaryAudio.duration)) {
      setDuration(primaryAudio.duration);
    }

    if (!isPlaying) {
      activeAudio.forEach((audio) => audio.pause());
      return;
    }

    activeAudio.forEach((audio) => {
      void audio.play().catch(() => undefined);
    });
  }, [
    audioSources.instrumental,
    audioSources.original,
    audioSources.vocals,
    currentTime,
    isPlaying,
    playbackMode
  ]);

  useEffect(() => {
    if (!isPlaying || playbackMode !== "mix") {
      return;
    }

    const interval = window.setInterval(() => {
      const primaryAudio = getPrimaryAudioElement("mix");
      const backingVocal = vocalAudioRef.current;

      if (!primaryAudio || !backingVocal) {
        return;
      }

      const drift = Math.abs(primaryAudio.currentTime - backingVocal.currentTime);
      if (drift > 0.12) {
        backingVocal.currentTime = primaryAudio.currentTime;
      }
    }, 700);

    return () => window.clearInterval(interval);
  }, [isPlaying, playbackMode]);

  useEffect(() => {
    if (activeLineIndex < 0) {
      return;
    }

    const container = lyricsViewportRef.current;
    const lineNode = lineRefs.current[activeLineIndex];

    if (!container || !lineNode) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const lineRect = lineNode.getBoundingClientRect();
    const topDelta =
      lineRect.top - containerRect.top - container.clientHeight / 2 + lineNode.clientHeight / 2;

    container.scrollTo({
      top: container.scrollTop + topDelta,
      behavior: "smooth"
    });
  }, [activeLineIndex]);

  const updateTimeFromPrimary = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    if (event.currentTarget !== getPrimaryAudioElement(playbackMode)) {
      return;
    }
    setCurrentTime(event.currentTarget.currentTime);
  };

  const updateDurationFromPrimary = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    if (event.currentTarget !== getPrimaryAudioElement(playbackMode)) {
      return;
    }
    if (Number.isFinite(event.currentTarget.duration)) {
      setDuration(event.currentTarget.duration);
    }
  };

  const handlePlaybackEnded = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    if (event.currentTarget !== getPrimaryAudioElement(playbackMode)) {
      return;
    }

    [originalAudioRef.current, instrumentalAudioRef.current, vocalAudioRef.current].forEach((audio) => {
      audio?.pause();
    });
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handlePlayPause = () => {
    const activeAudio = getActiveAudioElements(playbackMode);
    if (activeAudio.length === 0) {
      return;
    }

    if (isPlaying) {
      activeAudio.forEach((audio) => audio.pause());
      setIsPlaying(false);
      return;
    }

    activeAudio.forEach((audio) => {
      if (audio.readyState > 0 && Math.abs(audio.currentTime - currentTime) > 0.18) {
        audio.currentTime = currentTime;
      }
      void audio.play().catch(() => undefined);
    });
    setIsPlaying(true);
  };

  const handleSeek = (nextTime: number) => {
    [originalAudioRef.current, instrumentalAudioRef.current, vocalAudioRef.current].forEach((audio) => {
      if (audio && audio.readyState > 0) {
        audio.currentTime = nextTime;
      }
    });
    setCurrentTime(nextTime);
  };

  const handleModeChange = (nextMode: PlaybackMode) => {
    if (nextMode === playbackMode) {
      return;
    }

    const primaryAudio = getPrimaryAudioElement(playbackMode);
    const snapshotTime = primaryAudio?.currentTime ?? currentTime;
    setCurrentTime(snapshotTime);
    setPlaybackMode(nextMode);
  };

  const mixReady = Boolean(audioSources.instrumental || audioSources.vocals);
  const primaryLabel =
    playbackMode === "mix" ? "vocal + instrumental" : playbackMode;
  const songTitle = songDetail?.title?.trim() || `Cancion #${songId}`;
  const songArtist = songDetail?.artist?.trim() || "Artista pendiente";

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-white/40">Player</p>
        <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Karaoke playback</h3>
        <p className="mt-2 text-sm text-white/60">
          {songTitle} | {songArtist}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {(["mix", "original", "instrumental", "vocals"] as PlaybackMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              disabled={mode === "mix" ? !mixReady : !audioSources[mode]}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                playbackMode === mode
                  ? "bg-accent-500 text-black"
                  : "border border-white/10 bg-black/20 text-white/70 hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-40"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-black/25 p-4 sm:p-6">
          <div className="mb-6 h-32 rounded-3xl bg-[linear-gradient(90deg,rgba(249,115,22,0.25)_0%,rgba(34,211,238,0.2)_100%)] p-4">
            <div className="flex h-full items-end gap-2">
              {lyrics.lines.slice(0, 14).map((line) => (
                <div
                  key={line.line_index}
                  className={`w-full rounded-full transition ${
                    activeLineIndex === line.line_index ? "bg-white" : "bg-white/50"
                  }`}
                  style={{ height: `${24 + Math.min(Math.round((line.end - line.start) * 12), 84)}px` }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handlePlayPause}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <div className="text-sm text-white/70">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
              <div className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/45">
                {primaryLabel}
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={Math.max(duration, 0)}
              step={0.01}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => handleSeek(Number(event.target.value))}
              className="mt-4 h-2 w-full cursor-pointer accent-accent-500"
            />

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/45">
                  <span>Vocal volume</span>
                  <span>{Math.round(vocalVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={vocalVolume}
                  onChange={(event) => setVocalVolume(Number(event.target.value))}
                  className="mt-3 h-2 w-full cursor-pointer accent-neon-500"
                />
              </label>

              <label className="block">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/45">
                  <span>Instrumental volume</span>
                  <span>{Math.round(instrumentalVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={instrumentalVolume}
                  onChange={(event) => setInstrumentalVolume(Number(event.target.value))}
                  className="mt-3 h-2 w-full cursor-pointer accent-accent-500"
                />
              </label>
            </div>

            <p className="mt-4 text-xs text-white/45">
              Mix mode plays vocals and instrumental together. Use the two sliders to balance the karaoke blend.
            </p>
          </div>
        </div>

        <audio
          ref={originalAudioRef}
          preload="auto"
          src={audioSources.original ?? undefined}
          onTimeUpdate={updateTimeFromPrimary}
          onLoadedMetadata={updateDurationFromPrimary}
          onEnded={handlePlaybackEnded}
        />
        <audio
          ref={instrumentalAudioRef}
          preload="auto"
          src={audioSources.instrumental ?? undefined}
          onTimeUpdate={updateTimeFromPrimary}
          onLoadedMetadata={updateDurationFromPrimary}
          onEnded={handlePlaybackEnded}
        />
        <audio
          ref={vocalAudioRef}
          preload="auto"
          src={audioSources.vocals ?? undefined}
          onTimeUpdate={updateTimeFromPrimary}
          onLoadedMetadata={updateDurationFromPrimary}
          onEnded={handlePlaybackEnded}
        />
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">Lyrics</p>
            <h4 className="mt-2 text-xl font-semibold text-white">Synced lines</h4>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/35">Auto scroll live</p>
        </div>
        <div ref={lyricsViewportRef} className="mt-5 max-h-[24rem] space-y-3 overflow-y-auto pr-1 sm:max-h-[32rem]">
          {lyrics.lines.map((line, index) => {
            const active = index === activeLineIndex;
            return (
              <div
                key={line.line_index}
                ref={(node) => {
                  lineRefs.current[index] = node;
                }}
                className={`rounded-3xl border px-4 py-4 transition ${
                  active
                    ? "border-neon-500/30 bg-neon-500/10 shadow-glow"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-center sm:gap-4">
                  <p className={`text-base ${active ? "text-white" : "text-white/72"}`}>{line.text}</p>
                  <p className="text-xs text-white/35">
                    {line.start.toFixed(2)} - {line.end.toFixed(2)}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/45">
                  {line.words.map((word) => {
                    const wordActive = currentTime >= word.start && currentTime <= word.end;

                    return (
                      <span
                        key={`${line.line_index}-${word.word_index}`}
                        className={`rounded-full border px-2 py-1 transition ${
                          wordActive
                            ? "border-white/40 bg-white/10 text-white"
                            : "border-white/10 text-white/45"
                        }`}
                      >
                        {word.text}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
