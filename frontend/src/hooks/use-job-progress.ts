"use client";

import { useEffect, useState } from "react";

import type { Job } from "@/types/api";

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:8000";

export function useJobProgress(jobId: string | number | null) {
  const [jobState, setJobState] = useState<Job | null>(null);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const socket = new WebSocket(`${WS_BASE_URL}/ws/jobs/${jobId}`);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as Job;
      setJobState((current) => ({ ...current, ...payload } as Job));
    };

    return () => socket.close();
  }, [jobId]);

  return jobState;
}

