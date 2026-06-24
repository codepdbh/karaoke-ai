"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { User } from "@/types/api";

type AuthState = {
  token: string | null;
  user: User | null;
  hydrated: boolean;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  setHydrated: (hydrated: boolean) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set((state) => ({ ...state, user })),
      setHydrated: (hydrated) => set((state) => ({ ...state, hydrated })),
      clearSession: () => set({ token: null, user: null })
    }),
    {
      name: "karaoke-ai-auth",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      }
    }
  )
);
