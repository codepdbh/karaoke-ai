"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "@/lib/api-client";
import { demoLyrics } from "@/lib/demo-data";
import { getApiBaseUrl } from "@/lib/runtime-urls";
import { useAuthStore } from "@/store/auth-store";
import type { LyricsLine, LyricsPayload, SongDetail } from "@/types/api";

type StemTrack = "original" | "instrumental" | "vocals";
type PlaybackMode = "mix" | StemTrack;

type AudioSources = Record<StemTrack, string | null>;

type KaraokePlayerProps = {
  songId: string;
};

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
      const response = await fetch(`${getApiBaseUrl()}/api/v1/songs/${songId}/stream/${track}`, {
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
  const modeLabels: Record<PlaybackMode, string> = {
    mix: "Karaoke",
    original: "Original",
    instrumental: "Instrumental",
    vocals: "Voz"
  };
  const primaryLabel = modeLabels[playbackMode];
  const songTitle = songDetail?.title?.trim() || `Cancion #${songId}`;
  const songArtist = songDetail?.artist?.trim() || "Artista pendiente";
  const upcomingLineIndex = lyrics.lines.findIndex((line) => currentTime < line.end);
  const focusLineIndex = activeLineIndex >= 0 ? activeLineIndex : Math.max(0, upcomingLineIndex);
  const visibleStartIndex = Math.max(
    0,
    Math.min(focusLineIndex - 1, Math.max(0, lyrics.lines.length - 3))
  );
  const visibleLines = lyrics.lines.slice(visibleStartIndex, visibleStartIndex + 3);
  const getActiveWordIndex = (line: LyricsLine) => {
    const exactIndex = line.words.findIndex((word) => currentTime >= word.start && currentTime <= word.end);

    if (exactIndex >= 0) {
      return exactIndex;
    }

    for (let wordIndex = line.words.length - 1; wordIndex >= 0; wordIndex -= 1) {
      if (currentTime >= line.words[wordIndex].start && currentTime <= line.end) {
        return wordIndex;
      }
    }

    return -1;
  };
  const renderTimedWords = (line: LyricsLine) => {
    if (line.words.length === 0) {
      return line.text;
    }

    const activeWordIndex = getActiveWordIndex(line);

    return (
      <span className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {line.words.map((word, wordIndex) => {
          const wordActive = wordIndex === activeWordIndex;
          const baseClass = "inline-block rounded-md px-2 py-1 transition";
          const activeClass = "scale-105 bg-emerald-200 text-black shadow-[0_0_26px_rgba(110,231,183,0.45)]";
          const inactiveClass = "text-inherit";

          return (
            <span
              key={`${line.line_index}-${word.word_index}`}
              className={`${baseClass} ${wordActive ? activeClass : inactiveClass}`}
            >
              {word.text}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-panel sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/70">Modo cantar</p>
            <h3 className="mt-2 truncate text-2xl font-semibold text-white sm:text-3xl">{songTitle}</h3>
            <p className="mt-1 text-sm text-white/60">{songArtist}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["mix", "original", "instrumental", "vocals"] as PlaybackMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleModeChange(mode)}
                disabled={mode === "mix" ? !mixReady : !audioSources[mode]}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  playbackMode === mode
                    ? "bg-emerald-300 text-black"
                    : "border border-white/10 bg-black/25 text-white/70 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                }`}
              >
                {modeLabels[mode]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-black/[0.28] px-4 py-6 sm:px-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">Letra en movimiento</p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/35">3 lineas</p>
          </div>
          <div className="space-y-3 text-center">
            {visibleLines.map((line, visibleIndex) => {
              const absoluteIndex = visibleStartIndex + visibleIndex;
              const active = absoluteIndex === activeLineIndex;

              return (
                <div
                  key={line.line_index}
                  aria-current={active ? "true" : undefined}
                  className={`rounded-lg border px-4 py-4 transition ${
                    active
                      ? "border-emerald-300/40 bg-emerald-300/[0.12] shadow-glow"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <p
                    className={`mx-auto max-w-5xl font-semibold leading-tight transition ${
                      active
                        ? "text-2xl text-white sm:text-4xl lg:text-5xl"
                        : "text-base text-emerald-100/70 sm:text-xl"
                    }`}
                  >
                    {active ? renderTimedWords(line) : line.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-white/10 bg-base-900/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handlePlayPause}
              className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              {isPlaying ? "Pausar" : "Reproducir"}
            </button>
            <div className="text-sm font-medium text-white/70">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
            <div className="rounded-md border border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/50 sm:ml-auto">
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
            className="mt-4 w-full cursor-pointer accent-emerald-300"
          />

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                <span>Voz</span>
                <span>{Math.round(vocalVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={vocalVolume}
                onChange={(event) => setVocalVolume(Number(event.target.value))}
                className="mt-2 w-full cursor-pointer accent-emerald-300"
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                <span>Instrumental</span>
                <span>{Math.round(instrumentalVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={instrumentalVolume}
                onChange={(event) => setInstrumentalVolume(Number(event.target.value))}
                className="mt-2 w-full cursor-pointer accent-amber-300"
              />
            </label>
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

    </div>
  );
}
