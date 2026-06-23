"use client";

import { useEffect, useState } from "react";

import { apiClient, ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type { AdminUser } from "@/types/api";

export function UserManagement() {
  const { token, user } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  useEffect(() => {
    if (!token || user?.role !== "admin") {
      return;
    }

    apiClient.listUsers(token).then(setUsers).catch((err) => {
      setError(err instanceof ApiError ? err.message : "No fue posible cargar usuarios");
    });
  }, [token, user?.role]);

  const updateCredits = async (targetUser: AdminUser, delta: number) => {
    if (!token) {
      return;
    }

    setSavingUserId(targetUser.id);
    setError(null);
    try {
      const nextUser = await apiClient.updateUserCredits(
        token,
        targetUser.id,
        Math.max(0, targetUser.credits_remaining + delta)
      );
      setUsers((current) => current.map((entry) => (entry.id === nextUser.id ? nextUser : entry)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No fue posible actualizar creditos");
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/70">Admin</p>
        <h3 className="mt-2 text-2xl font-semibold text-white">Usuarios</h3>
        <p className="mt-2 text-sm text-white/55">
          Ajusta creditos sin entrar en configuraciones avanzadas.
        </p>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

        <div className="mt-5 overflow-x-auto rounded-lg border border-white/10">
          <table className="min-w-full text-left text-sm text-white/80">
            <thead className="bg-white/[0.04] text-xs font-semibold uppercase tracking-[0.12em] text-white/40">
              <tr>
                <th className="px-3 py-3">Usuario</th>
                <th className="px-3 py-3">Rol</th>
                <th className="px-3 py-3">Creditos</th>
                <th className="px-3 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((entry) => (
                <tr key={entry.id} className="border-t border-white/10">
                  <td className="px-3 py-4">
                    <p className="font-medium text-white">{entry.username}</p>
                    <p className="mt-1 text-xs text-white/45">{entry.email}</p>
                  </td>
                  <td className="px-3 py-4">{entry.role === "admin" ? "Admin" : "Usuario"}</td>
                  <td className="px-3 py-4">{entry.role === "admin" ? "Ilimitado" : entry.credits_remaining}</td>
                  <td className="px-3 py-4">
                    {entry.role === "admin" ? (
                      <span className="text-xs text-white/35">Sin limite</span>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateCredits(entry, -1)}
                          disabled={savingUserId === entry.id}
                          className="rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/[0.05] disabled:opacity-50"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => updateCredits(entry, 1)}
                          disabled={savingUserId === entry.id}
                          className="rounded-md bg-emerald-300 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-200 disabled:opacity-50"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => updateCredits(entry, 5)}
                          disabled={savingUserId === entry.id}
                          className="rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/[0.05] disabled:opacity-50"
                        >
                          +5
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
