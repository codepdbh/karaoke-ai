"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

export function AppShell({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, hydrated, setUser, clearSession } = useAuthStore();

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!token) {
      router.replace("/login");
      return;
    }

    apiClient
      .me(token)
      .then((nextUser) => {
        setUser(nextUser);
        if (pathname.startsWith("/admin") && nextUser.role !== "admin") {
          router.replace("/dashboard");
        }
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [clearSession, hydrated, pathname, router, setUser, token]);

  if (!hydrated || !token || !user) {
    return null;
  }

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-4 sm:px-4 md:flex-row md:px-6 md:py-6">
        <Sidebar />
        <main className="min-w-0 flex-1 space-y-4">
          <TopBar />
          {children}
        </main>
      </div>
    </div>
  );
}
