import Image from "next/image";

import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl rounded-[2rem] border border-white/10 bg-black/20 p-4 backdrop-blur md:grid md:grid-cols-[1.1fr_0.9fr] md:p-6">
        <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-8">
          <div className="relative inline-flex items-center justify-center rounded-3xl border border-white/20 bg-black/35 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_40px_rgba(34,211,238,0.2)] backdrop-blur">
            <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_30%_25%,rgba(34,211,238,0.28),transparent_55%),radial-gradient(circle_at_75%_80%,rgba(249,115,22,0.25),transparent_58%)]" />
            <Image
              src="/logo.png"
              alt="Karaoke AI logo"
              width={104}
              height={104}
              className="relative h-[104px] w-[104px] rounded-2xl object-cover"
              priority
            />
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.32em] text-white/40">karaoke-ai</p>
          <h1 className="mt-4 text-4xl font-semibold text-white md:text-5xl">Estudio local de karaoke</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/60">
            Sube canciones, separa stems, sincroniza letras y ajusta tiempos en un solo flujo. Todo
            corre en tu servidor con procesamiento local y control completo de tus pistas.
          </p>
        </section>
        <section className="flex items-center justify-center p-4 md:p-6">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
