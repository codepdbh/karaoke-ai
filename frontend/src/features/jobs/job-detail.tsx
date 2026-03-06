"use client";

import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import {
  PIPELINE_STEPS,
  translateJobStatus,
  translateJobStep,
  translateJobType
} from "@/features/jobs/job-labels";
import { useJobProgress } from "@/hooks/use-job-progress";
import { apiClient } from "@/lib/api-client";
import { demoJobs } from "@/lib/demo-data";
import { useAuthStore } from "@/store/auth-store";
import type { Job } from "@/types/api";

type JobDetailProps = {
  jobId: string;
};

export function JobDetail({ jobId }: JobDetailProps) {
  const { token } = useAuthStore();
  const [job, setJob] = useState<Job | null>(demoJobs[0] ?? null);
  const liveJob = useJobProgress(jobId);

  useEffect(() => {
    if (!token) {
      return;
    }
    apiClient.getJob(token, jobId).then(setJob).catch(() => undefined);
  }, [jobId, token]);

  const resolvedJob = useMemo(() => {
    if (job && liveJob) {
      return { ...job, ...liveJob };
    }
    return liveJob ?? job;
  }, [job, liveJob]);

  const currentIndex = useMemo(() => {
    if (!resolvedJob?.current_step) {
      return -1;
    }
    return PIPELINE_STEPS.findIndex((step) => step.key === resolvedJob.current_step);
  }, [resolvedJob]);

  if (!resolvedJob) {
    return <p className="text-sm text-white/60">Trabajo no encontrado.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Detalle del trabajo</p>
              <StatusBadge
                label={resolvedJob.status}
                displayLabel={translateJobStatus(resolvedJob.status)}
              />
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Trabajo #{resolvedJob.id}</h3>
            <p className="mt-3 text-sm text-white/60">
              Cancion #{resolvedJob.song_id ?? "-"} | {translateJobType(resolvedJob.job_type)}
            </p>
          </div>
          <div className="w-full rounded-3xl border border-white/10 bg-black/20 p-5 md:max-w-md">
            <div className="flex items-center justify-between text-xs text-white/45">
              <span>Progreso</span>
              <span>{resolvedJob.progress_percent}%</span>
            </div>
            <div className="mt-3 h-4 rounded-full bg-white/5">
              <div
                className="h-4 rounded-full bg-gradient-to-r from-accent-500 to-neon-500 transition-all duration-700"
                style={{ width: `${resolvedJob.progress_percent}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-white/70">{translateJobStep(resolvedJob.current_step)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h4 className="text-lg font-semibold text-white">Pasos del pipeline</h4>
          <div className="mt-5 space-y-3">
            {PIPELINE_STEPS.map((step, index) => {
              const active = index <= currentIndex || resolvedJob.status === "completed";
              return (
                <div
                  key={step.key}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    active
                      ? "border-neon-500/25 bg-neon-500/10 text-white"
                      : "border-white/10 bg-black/20 text-white/45"
                  }`}
                >
                  {step.label}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h4 className="text-lg font-semibold text-white">Diagnostico</h4>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-white/40">Paso actual</dt>
              <dd className="mt-1 text-white/80">{translateJobStep(resolvedJob.current_step)}</dd>
            </div>
            <div>
              <dt className="text-white/40">Creado en</dt>
              <dd className="mt-1 text-white/80">{resolvedJob.created_at}</dd>
            </div>
            <div>
              <dt className="text-white/40">Actualizado en</dt>
              <dd className="mt-1 text-white/80">{resolvedJob.updated_at}</dd>
            </div>
            <div>
              <dt className="text-white/40">Error</dt>
              <dd className="mt-1 text-white/80">{resolvedJob.error_message ?? "Ninguno"}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
