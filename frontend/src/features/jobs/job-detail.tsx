"use client";

import { useEffect, useMemo, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { useJobProgress } from "@/hooks/use-job-progress";
import { apiClient } from "@/lib/api-client";
import { demoJobs } from "@/lib/demo-data";
import { useAuthStore } from "@/store/auth-store";
import type { Job } from "@/types/api";

type JobDetailProps = {
  jobId: string;
};

const PIPELINE_LABELS = [
  "metadata",
  "waveform",
  "separation",
  "transcription",
  "alignment",
  "comparison",
  "export",
  "completed"
];

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
    return PIPELINE_LABELS.findIndex((step) => step === resolvedJob.current_step);
  }, [resolvedJob]);

  if (!resolvedJob) {
    return <p className="text-sm text-white/60">Job not found.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Job detail</p>
              <StatusBadge label={resolvedJob.status} />
            </div>
            <h3 className="mt-3 text-3xl font-semibold text-white">Job #{resolvedJob.id}</h3>
            <p className="mt-3 text-sm text-white/60">
              Song #{resolvedJob.song_id ?? "-"} | {resolvedJob.job_type}
            </p>
          </div>
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between text-xs text-white/45">
              <span>Progress</span>
              <span>{resolvedJob.progress_percent}%</span>
            </div>
            <div className="mt-3 h-4 rounded-full bg-white/5">
              <div
                className="h-4 rounded-full bg-gradient-to-r from-accent-500 to-neon-500"
                style={{ width: `${resolvedJob.progress_percent}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-white/70">{resolvedJob.current_step ?? "pending"}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h4 className="text-lg font-semibold text-white">Pipeline steps</h4>
          <div className="mt-5 space-y-3">
            {PIPELINE_LABELS.map((step, index) => {
              const active = index <= currentIndex || resolvedJob.status === "completed";
              return (
                <div
                  key={step}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    active
                      ? "border-neon-500/25 bg-neon-500/10 text-white"
                      : "border-white/10 bg-black/20 text-white/45"
                  }`}
                >
                  {step}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h4 className="text-lg font-semibold text-white">Diagnostics</h4>
          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-white/40">Current step</dt>
              <dd className="mt-1 text-white/80">{resolvedJob.current_step ?? "pending"}</dd>
            </div>
            <div>
              <dt className="text-white/40">Created at</dt>
              <dd className="mt-1 text-white/80">{resolvedJob.created_at}</dd>
            </div>
            <div>
              <dt className="text-white/40">Updated at</dt>
              <dd className="mt-1 text-white/80">{resolvedJob.updated_at}</dd>
            </div>
            <div>
              <dt className="text-white/40">Error</dt>
              <dd className="mt-1 text-white/80">{resolvedJob.error_message ?? "None"}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
