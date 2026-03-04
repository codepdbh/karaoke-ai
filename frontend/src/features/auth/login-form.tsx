"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiClient, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

export function LoginForm() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("D4niel123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.login(email, password);
      setSession(response.access_token, response.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No fue posible iniciar sesion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md rounded-[2rem] border border-white/10 bg-black/30 p-8 shadow-glow"
    >
      <p className="text-xs uppercase tracking-[0.28em] text-white/45">Acceso</p>
      <h1 className="mt-3 text-4xl font-semibold text-white">Entrar al estudio</h1>
      <p className="mt-3 text-sm text-white/60">
        Ingresa tu correo y contrasena para continuar a tu sesion de karaoke.
      </p>

      <div className="mt-8 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-white/65">Correo electronico</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/25"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-white/65">Contrasena</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-0 placeholder:text-white/25"
          />
        </label>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      <button
        disabled={loading}
        className="mt-6 w-full rounded-2xl bg-accent-500 px-4 py-3 font-semibold text-black transition hover:bg-accent-400 disabled:opacity-60"
      >
        {loading ? "Ingresando..." : "Iniciar sesion"}
      </button>
    </form>
  );
}
