import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl rounded-[2rem] border border-white/10 bg-black/20 p-4 backdrop-blur md:grid md:grid-cols-[1.1fr_0.9fr] md:p-6">
        <section className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-8">
          <p className="text-xs uppercase tracking-[0.32em] text-white/40">karaoke-ai</p>
          <h1 className="mt-4 text-4xl font-semibold text-white md:text-5xl">Local karaoke studio</h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-white/60">
            Upload tracks, split stems, align lyrics and edit timing in one flow. This starter
            front-end is wired to the FastAPI API and keeps working with demo data when the API is
            still empty.
          </p>
        </section>
        <section className="flex items-center justify-center p-4 md:p-6">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
