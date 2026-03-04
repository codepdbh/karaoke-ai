import type { Job, LyricsPayload, Song, SongDetail } from "@/types/api";

export const demoSongs: Song[] = [
  {
    id: 1,
    title: "Ciudad en eco",
    artist: "Demo Artist",
    album: "Night Session",
    duration_seconds: 182,
    language: "es",
    status: "uploaded",
    source_type: "upload",
    audio_fingerprint: "abc123demo",
    created_by: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const demoSongDetail: SongDetail = {
  ...demoSongs[0],
  files: [
    {
      id: 1,
      file_type: "original",
      storage_path: "songs/1/audio/original.mp3",
      mime_type: "audio/mpeg",
      size_bytes: 1200000,
      checksum: "demo",
      created_at: new Date().toISOString()
    }
  ]
};

export const demoLyrics: LyricsPayload = {
  song_id: 1,
  language: "es",
  version_id: 1,
  lines: [
    {
      line_index: 0,
      text: "Hoy te voy a contar",
      start: 12.14,
      end: 16.88,
      confidence: 0.96,
      words: [
        { word_index: 0, text: "Hoy", start: 12.14, end: 12.48, confidence: 0.97 },
        { word_index: 1, text: "te", start: 12.49, end: 12.62, confidence: 0.96 },
        { word_index: 2, text: "voy", start: 12.63, end: 13.0, confidence: 0.95 },
        { word_index: 3, text: "a", start: 13.01, end: 13.18, confidence: 0.95 },
        { word_index: 4, text: "contar", start: 13.19, end: 13.82, confidence: 0.94 }
      ]
    },
    {
      line_index: 1,
      text: "Cómo suena esta ciudad",
      start: 17.02,
      end: 20.74,
      confidence: 0.94,
      words: []
    }
  ]
};

export const demoJobs: Job[] = [
  {
    id: 1,
    song_id: 1,
    job_type: "process_song",
    status: "running",
    progress_percent: 64,
    current_step: "transcription",
    error_message: null,
    result_json: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

