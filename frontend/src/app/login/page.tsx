import Image from "next/image";

import { UserAccessForm } from "@/features/auth/user-access-form";
import { withAppBasePath } from "@/lib/runtime-urls";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-8 md:grid-cols-[1fr_420px] md:items-center">
        <section className="max-w-xl">
          <div className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] p-3 shadow-panel">
            <Image
              src={withAppBasePath("/logo.png")}
              alt="Karaoke AI logo"
              width={104}
              height={104}
              className="h-20 w-20 rounded-md object-cover sm:h-24 sm:w-24"
              priority
            />
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/70">karaoke-ai</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-white md:text-5xl">
            Tu sala de karaoke, sin menus raros.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-white/60">
            Entra, sube una cancion, procesa la pista y canta con letras grandes. Si tu cuenta es
            administradora, el panel de usuarios aparece automaticamente.
          </p>
          <div className="mt-7 grid gap-3 text-sm text-white/70 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">Sube audio</div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">Sincroniza letras</div>
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">Canta en pantalla</div>
          </div>
        </section>
        <section className="flex items-center justify-center">
          <UserAccessForm />
        </section>
      </div>
    </main>
  );
}
