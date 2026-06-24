"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import {
  PIPELINE_STEPS,
  translateJobStatus,
  translateJobStep,
  translateJobType
} from "@/features/jobs/job-labels";
import { useJobProgress } from "@/hooks/use-job-progress";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type { Job } from "@/types/api";

type JobDetailProps = {
  jobId: string;
};

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

export function JobDetail({ jobId }: JobDetailProps) {
  const { token } = useAuthStore();
  const [job, setJob] = useState<Job | null>(null);
  const [completionNoticeVisible, setCompletionNoticeVisible] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission | "unsupported">("default");
  const previousStatusRef = useRef<string | null>(null);
  const liveJob = useJobProgress(jobId);

  const loadJob = useCallback(async () => {
    if (!token) {
      return null;
    }

    try {
      const nextJob = await apiClient.getJob(token, jobId);
      setJob(nextJob);
      return nextJob;
    } catch {
      return null;
    }
  }, [jobId, token]);

  useEffect(() => {
    setJob(null);
    setCompletionNoticeVisible(false);
    previousStatusRef.current = null;
  }, [jobId]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;
    let interval: number | null = null;

    const refresh = async () => {
      const nextJob = await loadJob();
      if (!active) {
        return;
      }

      if (nextJob && TERMINAL_STATUSES.has(nextJob.status) && interval) {
        window.clearInterval(interval);
        interval = null;
      }
    };

    refresh();
    interval = window.setInterval(refresh, 1000);

    return () => {
      active = false;
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [loadJob, token]);

  const resolvedJob = useMemo(() => {
    if (job && liveJob) {
      return { ...job, ...liveJob };
    }
    return liveJob ?? job;
  }, [job, liveJob]);

  useEffect(() => {
    if (!resolvedJob) {
      return;
    }

    const previousStatus = previousStatusRef.current;
    const completedNow = resolvedJob.status === "completed" && previousStatus && previousStatus !== "completed";
    previousStatusRef.current = resolvedJob.status;

    if (!completedNow) {
      return;
    }

    setCompletionNoticeVisible(true);
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("Karaoke listo", {
        body: `Cancion #${resolvedJob.song_id ?? resolvedJob.id} lista para cantar.`
      });
    }
  }, [resolvedJob?.id, resolvedJob?.song_id, resolvedJob?.status]);

  const requestNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setNotificationPermission(nextPermission);
  };

  const currentIndex = useMemo(() => {
    if (!resolvedJob?.current_step) {
      return -1;
    }
    return PIPELINE_STEPS.findIndex((step) => step.key === resolvedJob.current_step);
  }, [resolvedJob]);

  if (!resolvedJob) {
    return <p className="text-sm text-white/60">Cargando trabajo...</p>;
  }

  const canSing = resolvedJob.status === "completed" && resolvedJob.song_id;
  const isActive = !TERMINAL_STATUSES.has(resolvedJob.status);

  return (
    <div className="space-y-6">
      {completionNoticeVisible && canSing ? (
        <div className="fixed bottom-5 right-5 z-50 w-[min(24rem,calc(100vw-2.5rem))] rounded-lg border border-emerald-300/30 bg-base-950/95 p-4 shadow-panel backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Karaoke listo</p>
              <p className="mt-1 text-sm text-white/60">La cancion ya esta preparada para cantar.</p>
            </div>
            <button
              type="button"
              onClick={() => setCompletionNoticeVisible(false)}
              className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/55 transition hover:bg-white/10"
            >
              Cerrar
            </button>
          </div>
          <Link
            href={`/player/${resolvedJob.song_id}`}
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-emerald-300 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-200"
          >
            Ir a cantar ahora
          </Link>
        </div>
      ) : null}

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
            <div className="mt-5 flex flex-wrap gap-3">
              {canSing ? (
                <Link
                  href={`/player/${resolvedJob.song_id}`}
                  className="inline-flex rounded-md bg-emerald-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-200"
                >
                  Ir a cantar ahora
                </Link>
              ) : null}
              {isActive && notificationPermission === "default" ? (
                <button
                  type="button"
                  onClick={requestNotifications}
                  className="rounded-md border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08]"
                >
                  Avisarme al terminar
                </button>
              ) : null}
            </div>
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
            {isActive ? (
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-emerald-200/60">
                Actualizando en vivo
              </p>
            ) : null}
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
