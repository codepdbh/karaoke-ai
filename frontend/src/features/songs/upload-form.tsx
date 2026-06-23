"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { apiClient, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type { Song } from "@/types/api";

const LOCAL_ARTISTS_KEY = "karaoke-ai-upload-artists";
const LOCAL_TITLES_KEY = "karaoke-ai-upload-titles";
const MAX_SAVED_SUGGESTIONS = 60;
const MAX_VISIBLE_SUGGESTIONS = 8;
const MAX_UPLOAD_SIZE_MB = 100;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const SONG_LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "pt", label: "Portugués" },
  { value: "fr", label: "Francés" },
  { value: "it", label: "Italiano" },
  { value: "de", label: "Alemán" },
  { value: "nl", label: "Neerlandés" },
  { value: "pl", label: "Polaco" },
  { value: "ru", label: "Ruso" },
  { value: "tr", label: "Turco" },
  { value: "ar", label: "Árabe" },
  { value: "hi", label: "Hindi" },
  { value: "ja", label: "Japonés" },
  { value: "ko", label: "Coreano" },
  { value: "zh", label: "Chino" }
];

function normalizeUnique(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];

  values.forEach((value) => {
    const cleaned = value.trim();
    if (!cleaned) {
      return;
    }
    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    next.push(cleaned);
  });

  return next;
}

function readLocalSuggestions(key: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return normalizeUnique(parsed.map((item) => String(item)));
  } catch {
    return [];
  }
}

function saveLocalSuggestions(key: string, values: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    key,
    JSON.stringify(normalizeUnique(values).slice(0, MAX_SAVED_SUGGESTIONS))
  );
}

function buildSuggestions(values: string[], query: string): string[] {
  const cleaned = query.trim().toLowerCase();
  if (!cleaned) {
    return values.slice(0, MAX_VISIBLE_SUGGESTIONS);
  }
  return values
    .filter((value) => value.toLowerCase().includes(cleaned))
    .slice(0, MAX_VISIBLE_SUGGESTIONS);
}

export function UploadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const songIdParam = searchParams.get("songId");

  const { token, user, setUser } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [language, setLanguage] = useState("es");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [knownArtists, setKnownArtists] = useState<string[]>([]);
  const [knownTitles, setKnownTitles] = useState<string[]>([]);
  const [uploadedSong, setUploadedSong] = useState<Song | null>(null);

  useEffect(() => {
    const localArtists = readLocalSuggestions(LOCAL_ARTISTS_KEY);
    const localTitles = readLocalSuggestions(LOCAL_TITLES_KEY);
    setKnownArtists(localArtists);
    setKnownTitles(localTitles);

    if (!token) {
      return;
    }

    let active = true;

    apiClient
      .getSongs(token)
      .then((songs) => {
        if (!active) {
          return;
        }

        const remoteArtists = songs.map((song) => song.artist ?? "");
        const remoteTitles = songs.map((song) => song.title ?? "");

        setKnownArtists(normalizeUnique([...remoteArtists, ...localArtists]));
        setKnownTitles(normalizeUnique([...remoteTitles, ...localTitles]));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !songIdParam) {
      return;
    }

    let active = true;
    apiClient
      .getSong(token, songIdParam)
      .then((song) => {
        if (!active) {
          return;
        }
        setUploadedSong(song);
        setTitle(song.title || "");
        setArtist(song.artist || "");
        setLanguage(song.language || "es");
      })
      .catch((err) => {
        console.error("No se pudo cargar la cancion importada:", err);
      });

    return () => {
      active = false;
    };
  }, [token, songIdParam]);

  const titleSuggestions = useMemo(() => buildSuggestions(knownTitles, title), [knownTitles, title]);
  const artistSuggestions = useMemo(
    () => buildSuggestions(knownArtists, artist),
    [knownArtists, artist]
  );

  const rememberTitle = (value: string) => {
    setKnownTitles((current) => {
      const next = normalizeUnique([value, ...current]).slice(0, MAX_SAVED_SUGGESTIONS);
      saveLocalSuggestions(LOCAL_TITLES_KEY, next);
      return next;
    });
  };

  const rememberArtist = (value: string) => {
    setKnownArtists((current) => {
      const next = normalizeUnique([value, ...current]).slice(0, MAX_SAVED_SUGGESTIONS);
      saveLocalSuggestions(LOCAL_ARTISTS_KEY, next);
      return next;
    });
  };

  const validateSelectedFile = (nextFile: File | null) => {
    if (!nextFile) {
      return "Selecciona un archivo y asegurate de tener sesion activa.";
    }

    if (nextFile.size > MAX_UPLOAD_SIZE_BYTES) {
      return `Cada cancion puede pesar como maximo ${MAX_UPLOAD_SIZE_MB} MB.`;
    }

    return null;
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (uploadedSong) {
      await convertUploadedSong();
      return;
    }

    if (!token) {
      setMessage("Selecciona un archivo y asegurate de tener sesion activa.");
      return;
    }

    const selectedFile = file;
    const fileError = validateSelectedFile(selectedFile);
    if (fileError) {
      setMessage(fileError);
      return;
    }
    if (!selectedFile) {
      setMessage("Selecciona un archivo y asegurate de tener sesion activa.");
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setMessage(null);
    try {
      const song = await apiClient.uploadSong(
        token,
        selectedFile,
        { title, artist, language },
        (percent) => setUploadProgress(percent)
      );
      setUploadProgress(100);
      setMessage(`Cancion cargada: ${song.title} (#${song.id})`);
      setUploadedSong(song);

      rememberTitle(song.title || title);
      rememberArtist(song.artist || artist);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "No se pudo subir el audio.");
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const convertUploadedSong = async () => {
    if (!token || !uploadedSong) {
      return;
    }

    setConverting(true);
    setMessage(null);

    try {
      const hasChanged =
        title !== (uploadedSong.title || "") ||
        artist !== (uploadedSong.artist || "") ||
        language !== (uploadedSong.language || "");

      if (hasChanged) {
        await apiClient.updateSong(token, uploadedSong.id, {
          title,
          artist,
          language
        });
      }

      const job = await apiClient.triggerSongProcess(token, uploadedSong.id);
      if (user && user.role !== "admin") {
        setUser({ ...user, credits_remaining: Math.max(0, user.credits_remaining - 1) });
      }
      router.push(`/jobs/${job.id}`);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "No se pudo iniciar la conversion.");
    } finally {
      setConverting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-panel sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/70">Subida</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Nueva cancion</h3>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Elige un audio y agrega datos basicos. Si no recuerdas todo, puedes completarlo despues.
        </p>

        <div className="mt-6 space-y-4">
          <input
            type="file"
            accept=".mp3,.wav,.flac,.m4a,audio/*"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              const nextError = validateSelectedFile(nextFile);
              setFile(nextError ? null : nextFile);
              setMessage(nextError);
              setUploadedSong(null);
              setUploadProgress(0);

              if (nextError) {
                event.currentTarget.value = "";
              }
            }}
            className="w-full rounded-md border border-dashed border-white/15 bg-black/20 px-4 py-5 text-sm text-white/70 sm:py-6"
          />

          <div>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titulo"
              list="title-suggestions"
              className="w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/50"
            />
            {titleSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {titleSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setTitle(suggestion)}
                    className="rounded-md border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70 transition hover:bg-white/[0.08]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <datalist id="title-suggestions">
              {titleSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>

          <div>
            <input
              value={artist}
              onChange={(event) => setArtist(event.target.value)}
              placeholder="Artista"
              list="artist-suggestions"
              className="w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/50"
            />
            {artistSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {artistSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setArtist(suggestion)}
                    className="rounded-md border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70 transition hover:bg-white/[0.08]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <datalist id="artist-suggestions">
              {artistSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-white/70">
              ¿En qué idioma está la canción?
            </span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-emerald-300/50"
            >
              {SONG_LANGUAGES.map((option) => (
                <option key={option.value} value={option.value} className="bg-base-950 text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-panel sm:p-5">
        <h3 className="text-lg font-semibold text-white">Antes de subir</h3>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-white/60">
          <li>Acepta MP3, WAV, FLAC y M4A.</li>
          <li>Limite maximo: 100 MB por cancion.</li>
          <li>Despues de cargarla, pulsa Convertir a karaoke ahora.</li>
          <li>Los artistas y titulos usados antes se sugieren automaticamente.</li>
        </ul>
        {(loading || uploadProgress > 0) && (
          <div className="mt-5 rounded-lg border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
              <span>Carga</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="mt-3 h-2.5 rounded-full bg-white/10">
              <div
                className="h-2.5 rounded-full bg-gradient-to-r from-accent-500 to-neon-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
        {message ? <p className="mt-4 text-sm text-white/80">{message}</p> : null}
        {uploadedSong ? (
          <button
            type="button"
            onClick={convertUploadedSong}
            disabled={converting}
            className="mt-6 w-full rounded-md bg-gradient-to-r from-emerald-300 via-lime-200 to-amber-300 px-4 py-4 text-base font-bold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_18px_48px_rgba(52,211,153,0.28)] transition hover:scale-[1.01] hover:brightness-110 disabled:scale-100 disabled:opacity-60"
          >
            {converting ? "Convirtiendo..." : "Convertir a karaoke ahora"}
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-md bg-emerald-300 px-4 py-3 font-semibold text-black transition hover:bg-emerald-200 disabled:opacity-60"
          >
            {loading ? "Subiendo..." : "Cargar cancion"}
          </button>
        )}
      </section>
    </form>
  );
}
