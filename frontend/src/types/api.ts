export type User = {
  id: number;
  email: string;
  username: string;
  role: string;
};

export type SongFile = {
  id: number;
  file_type: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  checksum: string | null;
  created_at: string;
};

export type Song = {
  id: number;
  title: string;
  artist: string | null;
  album: string | null;
  duration_seconds: number | null;
  language: string | null;
  status: string;
  source_type: string;
  audio_fingerprint: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type SongDetail = Song & {
  files: SongFile[];
};

export type WordTiming = {
  word_index: number;
  text: string;
  start: number;
  end: number;
  confidence?: number | null;
};

export type LyricsLine = {
  line_index: number;
  text: string;
  start: number;
  end: number;
  confidence?: number | null;
  words: WordTiming[];
};

export type LyricsPayload = {
  song_id: number;
  language: string | null;
  version_id: number;
  lines: LyricsLine[];
};

export type LyricsVersion = {
  id: number;
  song_id: number;
  version_name: string;
  source_type: string;
  source_provider: string;
  status: string;
  language: string | null;
  confidence_score: number | null;
  is_locked: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  lines: Array<{
    id: number;
    line_index: number;
    text: string;
    start_time: number | null;
    end_time: number | null;
    confidence_score: number | null;
    words: Array<{
      id: number;
      word_index: number;
      word: string;
      start_time: number | null;
      end_time: number | null;
      confidence_score: number | null;
    }>;
  }>;
};

export type Job = {
  id: number;
  song_id: number | null;
  job_type: string;
  status: string;
  progress_percent: number;
  current_step: string | null;
  error_message: string | null;
  result_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

