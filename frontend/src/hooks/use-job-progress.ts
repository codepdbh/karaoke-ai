"use client";

import { useEffect, useState } from "react";
import { getWsBaseUrl } from "@/lib/runtime-urls";

import type { Job } from "@/types/api";

export function useJobProgress(jobId: string | number | null) {
  const [jobState, setJobState] = useState<Job | null>(null);

  useEffect(() => {
    if (!jobId) {
      return;
    }

    const socket = new WebSocket(`${getWsBaseUrl()}/ws/jobs/${jobId}`);
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as Job;
      setJobState((current) => ({ ...current, ...payload } as Job));
    };

    return () => socket.close();
  }, [jobId]);

  return jobState;
}
