"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiClient, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type { MusicSearchResult } from "@/types/api";

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

function formatSize(sizeBytes: number | null) {
  if (!sizeBytes) {
    return "tamano desconocido";
  }
  const megabytes = sizeBytes / 1024 / 1024;
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

function buildErrorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

export function MusicSearchImport() {
  const router = useRouter();
  const { token, user, setUser } = useAuthStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicSearchResult[]>([]);
  const [language, setLanguage] = useState("es");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [directUrl, setDirectUrl] = useState("");
  const [directTitle, setDirectTitle] = useState("");
  const [directArtist, setDirectArtist] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const [downloadStepText, setDownloadStepText] = useState("Preparando...");

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setMessage("Inicia sesion para buscar canciones.");
      return;
    }
    if (query.trim().length < 2) {
      setMessage("Escribe al menos dos letras para buscar.");
      return;
    }

    setSearching(true);
    setMessage(null);
    try {
      const nextResults = await apiClient.searchMusic(token, query.trim());
      setResults(nextResults);
      setMessage(nextResults.length ? null : "No encontre audios compatibles para esa busqueda.");
    } catch (err) {
      setMessage(buildErrorMessage(err, "No se pudo buscar en la biblioteca."));
    } finally {
      setSearching(false);
    }
  };

  const importAndProcess = async (
    key: string,
    payload: {
      url: string;
      title?: string;
      artist?: string;
      album?: string;
      language?: string;
    }
  ) => {
    if (!token) {
      setMessage("Inicia sesion para importar canciones.");
      return;
    }
    if (!rightsConfirmed) {
      setMessage("Confirma que tienes derecho a usar ese audio.");
      return;
    }

    setImportingKey(key);
    setMessage(null);

    const steps = [
      "Obteniendo metadatos...",
      "Buscando audio lossless...",
      "Descargando audio de alta calidad...",
      "Incrustando portada y etiquetas...",
      "Finalizando descarga..."
    ];
    let stepIndex = 0;
    setDownloadStepText(steps[0]);
    const timer = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, steps.length - 1);
      setDownloadStepText(steps[stepIndex]);
    }, 3500);

    try {
      const song = await apiClient.importMusicUrl(token, {
        ...payload,
        language,
        rights_confirmed: true
      });
      router.push(`/upload?songId=${song.id}`);
    } catch (err) {
      setMessage(buildErrorMessage(err, "No se pudo descargar la cancion."));
    } finally {
      clearInterval(timer);
      setImportingKey(null);
    }
  };

  const importDirectUrl = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!directUrl.trim()) {
      setMessage("Pega una URL directa de audio.");
      return;
    }

    await importAndProcess("direct-url", {
      url: directUrl.trim(),
      title: directTitle.trim() || undefined,
      artist: directArtist.trim() || undefined
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-panel sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/70">
          Búsqueda (Spotify)
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Buscar cancion</h3>
        <form onSubmit={search} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar en Spotify... (artista o canción)"
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/50"
          />
          <button
            type="submit"
            disabled={searching}
            className="rounded-md bg-emerald-300 px-5 py-3 font-semibold text-black transition hover:bg-emerald-200 disabled:opacity-60"
          >
            {searching ? "Buscando..." : "Buscar"}
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {results.map((result) => (
            <article key={`${result.source_id}-${result.filename}`} className="rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {result.cover_url ? (
                    <img
                      src={result.cover_url}
                      alt={result.title}
                      className="h-16 w-16 shrink-0 rounded-md object-cover border border-white/10"
                    />
                  ) : (
                    <div className="h-16 w-16 shrink-0 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white/20 text-xl">
                      🎵
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/35">
                      {result.source_label}
                    </p>
                    <h4 className="mt-1 break-words text-lg font-semibold text-white">{result.title}</h4>
                    <p className="mt-1 text-sm text-white/60">
                      {result.artist ?? "Artista desconocido"}
                      {result.year ? ` | ${result.year}` : ""}
                    </p>
                    <p className="mt-1 break-all text-xs text-white/40">
                      {result.filename} | {formatSize(result.size_bytes)}
                    </p>
                    {result.license_url ? (
                      <a
                        href={result.license_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-semibold text-emerald-200/80 hover:text-emerald-100"
                      >
                        Ver licencia
                      </a>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!rightsConfirmed || importingKey !== null}
                  onClick={() =>
                    importAndProcess(result.source_id, {
                      url: result.download_url,
                      title: result.title,
                      artist: result.artist ?? undefined,
                      album: result.album ?? undefined
                    })
                  }
                  className="rounded-md bg-gradient-to-r from-emerald-300 via-lime-200 to-amber-300 px-5 py-3 text-sm font-black tracking-[0.06em] text-black shadow-[0_14px_38px_rgba(52,211,153,0.22)] transition hover:scale-[1.01] hover:brightness-110 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-45 lg:min-w-[13rem]"
                >
                  {importingKey === result.source_id ? downloadStepText : "Descargar y convertir"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-panel sm:p-5">
          <h3 className="text-lg font-semibold text-white">Importar URL directa</h3>
          <form onSubmit={importDirectUrl} className="mt-4 space-y-3">
            <input
              value={directUrl}
              onChange={(event) => setDirectUrl(event.target.value)}
              placeholder="https://.../cancion.mp3 o URL de Spotify/YouTube/Tidal..."
              className="w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/50"
            />
            <input
              value={directTitle}
              onChange={(event) => setDirectTitle(event.target.value)}
              placeholder="Titulo"
              className="w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/50"
            />
            <input
              value={directArtist}
              onChange={(event) => setDirectArtist(event.target.value)}
              placeholder="Artista"
              className="w-full rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/50"
            />
            <button
              type="submit"
              disabled={importingKey !== null}
              className="w-full rounded-md bg-gradient-to-r from-emerald-300 via-lime-200 to-amber-300 px-4 py-4 text-base font-bold text-black shadow-[0_18px_48px_rgba(52,211,153,0.28)] transition hover:scale-[1.01] hover:brightness-110 disabled:scale-100 disabled:opacity-60"
            >
              {importingKey === "direct-url" ? downloadStepText : "Descargar y convertir"}
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-panel sm:p-5">
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

          <label className="mt-4 flex gap-3 rounded-md border border-white/10 bg-black/20 p-3 text-sm leading-5 text-white/70">
            <input
              type="checkbox"
              checked={rightsConfirmed}
              onChange={(event) => setRightsConfirmed(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-emerald-300"
            />
            <span>Tengo derecho a usar este audio en mi karaoke.</span>
          </label>
          <p className="mt-3 text-xs leading-5 text-white/45">
            Uso interno y de pruebas. Permite buscar e importar canciones desde Spotify, YouTube, Tidal, Apple Music, SoundCloud y Pandora.
          </p>
          {message ? <p className="mt-4 text-sm text-white/80">{message}</p> : null}
        </div>
      </section>
    </div>
  );
}
