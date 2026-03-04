type PipelineStep = {
  key: string;
  label: string;
};

const JOB_STATUS_LABELS: Record<string, string> = {
  queued: "en cola",
  running: "en ejecucion",
  completed: "completado",
  failed: "fallido",
  cancelled: "cancelado"
};

const JOB_TYPE_LABELS: Record<string, string> = {
  process_song: "procesar cancion"
};

const JOB_STEP_LABELS: Record<string, string> = {
  queued: "en cola",
  "loading-song": "cargando cancion",
  metadata: "leyendo metadata",
  waveform: "generando waveform",
  separation: "separando voces e instrumental",
  transcription: "transcribiendo voz",
  alignment: "alineando palabras",
  comparison: "comparando letras",
  export: "exportando resultados",
  completed: "completado",
  failed: "fallido"
};

export const PIPELINE_STEPS: PipelineStep[] = [
  { key: "queued", label: "En cola" },
  { key: "loading-song", label: "Carga de cancion" },
  { key: "metadata", label: "Metadata" },
  { key: "waveform", label: "Waveform" },
  { key: "separation", label: "Separacion" },
  { key: "transcription", label: "Transcripcion" },
  { key: "alignment", label: "Alineacion" },
  { key: "comparison", label: "Comparacion" },
  { key: "export", label: "Exportacion" },
  { key: "completed", label: "Completado" }
];

export function translateJobStatus(status: string): string {
  return JOB_STATUS_LABELS[status] ?? status;
}

export function translateJobType(jobType: string): string {
  return JOB_TYPE_LABELS[jobType] ?? jobType.split("_").join(" ");
}

export function translateJobStep(step: string | null): string {
  if (!step) {
    return "pendiente";
  }
  return JOB_STEP_LABELS[step] ?? step.split("-").join(" ");
}
