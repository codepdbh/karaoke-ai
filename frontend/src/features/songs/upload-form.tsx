"use client";

import { FormEvent, useState } from "react";

import { apiClient, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

export function UploadForm() {
  const { token } = useAuthStore();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [language, setLanguage] = useState("es");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file || !token) {
      setMessage("Selecciona un archivo y asegúrate de tener sesión activa.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const song = await apiClient.uploadSong(token, file, { title, artist, language });
      setMessage(`Canción cargada: ${song.title} (#${song.id})`);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "No se pudo subir el audio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.24em] text-white/45">Upload</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Nueva canción</h3>

        <div className="mt-6 space-y-4">
          <input
            type="file"
            accept=".mp3,.wav,.flac,.m4a,audio/*"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-6 text-sm text-white/70"
          />
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/25"
          />
          <input
            value={artist}
            onChange={(event) => setArtist(event.target.value)}
            placeholder="Artista"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/25"
          />
          <input
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            placeholder="Idioma"
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/25"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-lg font-semibold text-white">Notas</h3>
        <ul className="mt-4 space-y-3 text-sm text-white/60">
          <li>Acepta MP3, WAV, FLAC y M4A.</li>
          <li>El procesamiento pesado se ejecuta por Celery.</li>
          <li>Los modelos se resuelven desde la carpeta `models/`.</li>
        </ul>
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

