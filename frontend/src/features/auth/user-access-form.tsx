"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { apiClient, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

export function UserAccessForm() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response =
        mode === "register"
          ? await apiClient.registerUser(email, firstName, lastName, password)
          : await apiClient.loginUser(email, password);
      setSession(response.access_token, response.user);
      router.push(response.user.role === "admin" ? "/admin/users" : "/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : mode === "register"
            ? "No fue posible registrarse"
            : "No fue posible iniciar sesion"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-panel sm:p-7"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">Acceso unico</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">
        {mode === "login" ? "Entrar" : "Crear cuenta"}
      </h1>
      <p className="mt-3 text-sm text-white/60">
        Usa el mismo formulario para usuarios y administradores. El sistema abre el panel correcto segun tu rol.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/25 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`rounded-md px-4 py-2.5 text-sm font-medium transition ${
            mode === "login" ? "bg-white text-black" : "text-white/60 hover:bg-white/[0.06]"
          }`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setError(null);
          }}
          className={`rounded-md px-4 py-2.5 text-sm font-medium transition ${
            mode === "register" ? "bg-white text-black" : "text-white/60 hover:bg-white/[0.06]"
          }`}
        >
          Registro
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-white/60">Correo electronico</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            className="w-full rounded-md border border-white/10 bg-black/25 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-white/25 focus:border-emerald-300/50"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm text-white/60">Contrasena</span>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            required
            className="w-full rounded-md border border-white/10 bg-black/25 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-white/25 focus:border-emerald-300/50"
          />
        </label>
        {mode === "register" ? (
          <>
            <label className="block">
              <span className="mb-2 block text-sm text-white/60">Nombre</span>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                type="text"
                required
                className="w-full rounded-md border border-white/10 bg-black/25 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-white/25 focus:border-emerald-300/50"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-white/60">Apellido</span>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                type="text"
                required
                className="w-full rounded-md border border-white/10 bg-black/25 px-4 py-3 text-white outline-none ring-0 transition placeholder:text-white/25 focus:border-emerald-300/50"
              />
            </label>
          </>
        ) : null}
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      <button
        disabled={loading}
        className="mt-6 w-full rounded-md bg-emerald-300 px-4 py-3 font-semibold text-black transition hover:bg-emerald-200 disabled:opacity-60"
      >
        {loading ? (mode === "register" ? "Registrando..." : "Ingresando...") : mode === "register" ? "Crear cuenta" : "Entrar"}
      </button>
    </form>
  );
}
