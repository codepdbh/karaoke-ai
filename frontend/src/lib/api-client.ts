"use client";

import type { Job, LyricsPayload, LyricsVersion, Song, SongDetail, User } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = RequestInit & {
  token?: string | null;
};

type UploadRequestOptions = {
  token?: string | null;
  body: FormData;
  onUploadProgress?: (percent: number) => void;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const payload = await response.json();
      detail = payload.detail ?? payload.message ?? detail;
    } catch {
      detail = response.statusText || detail;
    }
    throw new ApiError(detail, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function uploadRequest<T>(path: string, options: UploadRequestOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}${path}`, true);
    xhr.setRequestHeader("Accept", "application/json");

    if (options.token) {
      xhr.setRequestHeader("Authorization", `Bearer ${options.token}`);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !options.onUploadProgress) {
        return;
      }
      const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
      options.onUploadProgress(percent);
    };

    xhr.onerror = () => {
      reject(new ApiError("Network error", xhr.status || 0));
    };

    xhr.onload = () => {
      const raw = xhr.responseText ?? "";
      let payload: Record<string, unknown> | null = null;

      if (raw) {
        try {
          payload = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          payload = null;
        }
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload as T);
        return;
      }

      const detail =
        (payload?.detail as string | undefined) ??
        (payload?.message as string | undefined) ??
        xhr.statusText ??
        "Request failed";
      reject(new ApiError(detail, xhr.status || 0));
    };

    xhr.send(options.body);
  });
}

export const apiClient = {
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string; user: User }>("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    }),
  me: (token: string) => request<User>("/api/v1/auth/me", { token }),
  getSongs: (token: string, query?: string) =>
    request<Song[]>(`/api/v1/songs${query ? `?q=${encodeURIComponent(query)}` : ""}`, { token }),
  getSong: (token: string, songId: string | number) =>
    request<SongDetail>(`/api/v1/songs/${songId}`, { token }),
  getJobs: (token: string) => request<Job[]>("/api/v1/jobs", { token }),
  getJob: (token: string, jobId: string | number) =>
    request<Job>(`/api/v1/jobs/${jobId}`, { token }),
  triggerSongProcess: (token: string, songId: string | number) =>
    request<Job>(`/api/v1/songs/${songId}/process`, { method: "POST", token }),
  getLyrics: (token: string, songId: string | number) =>
    request<LyricsPayload>(`/api/v1/songs/${songId}/lyrics`, { token }),
  getLyricsVersions: (token: string, songId: string | number) =>
    request<LyricsVersion[]>(`/api/v1/songs/${songId}/lyrics/versions`, { token }),
  getLyricsVersion: (token: string, versionId: string | number) =>
    request<LyricsVersion>(`/api/v1/lyrics/versions/${versionId}`, { token }),
  saveLyricsVersion: (token: string, songId: string | number, payload: unknown) =>
    request<LyricsVersion>(`/api/v1/songs/${songId}/lyrics/versions`, {
      method: "POST",
      token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
  updateLyricsVersion: (token: string, versionId: string | number, payload: unknown) =>
    request<LyricsVersion>(`/api/v1/lyrics/versions/${versionId}`, {
      method: "PUT",
      token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),
  publishLyricsVersion: (token: string, versionId: string | number) =>
    request<LyricsVersion>(`/api/v1/lyrics/versions/${versionId}/publish`, {
      method: "POST",
      token
    }),
  uploadSong: async (
    token: string,
    file: File,
    metadata: { title?: string; artist?: string; album?: string; language?: string },
    onUploadProgress?: (percent: number) => void
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    Object.entries(metadata).forEach(([key, value]) => {
      if (value) {
        formData.append(key, value);
      }
    });

    return uploadRequest<Song>("/api/v1/uploads/song", {
      token,
      body: formData,
      onUploadProgress
    });
  }
};
