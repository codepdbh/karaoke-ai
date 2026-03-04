"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { apiClient } from "@/lib/api-client";
import { demoJobs } from "@/lib/demo-data";
import { useAuthStore } from "@/store/auth-store";
import type { Job } from "@/types/api";

export function JobList() {
  const { token } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>(demoJobs);

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    const loadJobs = () => {
      apiClient
        .getJobs(token)
        .then((nextJobs) => {
          if (active) {
            setJobs(nextJobs);
          }
        })
        .catch(() => undefined);
    };

    loadJobs();
    const interval = window.setInterval(loadJobs, 2000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [token]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">Jobs</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Processing queue</h3>
        </div>
        <p className="max-w-md text-sm text-white/55">
          Heavy work runs on Celery workers. This view tracks progress, current step and failures.
        </p>
      </div>

      <div className="grid gap-4">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.05]"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-white">Job #{job.id}</p>
                  <StatusBadge label={job.status} />
                </div>
                <p className="mt-2 text-sm text-white/60">
                  Song #{job.song_id ?? "-"} | {job.job_type}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-white/35">
                  {job.current_step ?? "pending"}
                </p>
              </div>
              <div className="w-full max-w-md">
                <div className="flex items-center justify-between text-xs text-white/45">
                  <span>Progress</span>
                  <span>{job.progress_percent}%</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-black/30">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-accent-500 to-neon-500"
                    style={{ width: `${job.progress_percent}%` }}
                  />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
