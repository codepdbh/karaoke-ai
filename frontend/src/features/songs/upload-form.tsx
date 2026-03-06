"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiClient, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

const LOCAL_ARTISTS_KEY = "karaoke-ai-upload-artists";
const LOCAL_TITLES_KEY = "karaoke-ai-upload-titles";
const MAX_SAVED_SUGGESTIONS = 60;
const MAX_VISIBLE_SUGGESTIONS = 8;

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
  const { token } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [language, setLanguage] = useState("es");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [knownArtists, setKnownArtists] = useState<string[]>([]);
  const [knownTitles, setKnownTitles] = useState<string[]>([]);

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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !token) {
      setMessage("Selecciona un archivo y asegurate de tener sesion activa.");
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    setMessage(null);
    try {
      const song = await apiClient.uploadSong(
        token,
        file,
        { title, artist, language },
        (percent) => setUploadProgress(percent)
      );
      setUploadProgress(100);
      setMessage(`Cancion cargada: ${song.title} (#${song.id})`);

      rememberTitle(song.title || title);
      rememberArtist(song.artist || artist);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "No se pudo subir el audio.");
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">Subida</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Nueva cancion</h3>

        <div className="mt-6 space-y-4">
          <input
            type="file"
            accept=".mp3,.wav,.flac,.m4a,audio/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-5 text-sm text-white/70 sm:py-6"
          />

          <div>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titulo"
              list="title-suggestions"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/25"
            />
            {titleSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {titleSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setTitle(suggestion)}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70 transition hover:bg-white/[0.08]"
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
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/25"
            />
            {artistSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {artistSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setArtist(suggestion)}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70 transition hover:bg-white/[0.08]"
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

          <input
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            placeholder="Idioma"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/25"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <h3 className="text-lg font-semibold text-white">Notas</h3>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-white/60">
          <li>Acepta MP3, WAV, FLAC y M4A.</li>
          <li>El procesamiento pesado se ejecuta por Celery.</li>
          <li>Los modelos se cargan desde la carpeta `models/`.</li>
          <li>Artistas y titulos usados antes se sugieren automaticamente.</li>
        </ul>
        {(loading || uploadProgress > 0) && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/45">
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
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-accent-500 px-4 py-3 font-semibold text-black transition hover:bg-accent-400 disabled:opacity-60"
        >
          {loading ? "Subiendo..." : "Subir audio"}
        </button>
      </section>
    </form>
  );
}
