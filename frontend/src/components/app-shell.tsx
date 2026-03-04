import type { PropsWithChildren } from "react";

import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/topbar";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.14),_transparent_30%),radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_28%),linear-gradient(180deg,#09090f_0%,#10101a_45%,#0b0b12_100%)] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:flex-row md:p-6">
        <Sidebar />
        <main className="flex-1 space-y-6">
          <TopBar />
          <div className="rounded-[2rem] border border-white/10 bg-black/15 p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

