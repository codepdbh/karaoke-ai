type StatusBadgeProps = {
  label: string;
  displayLabel?: string;
};

const colorMap: Record<string, string> = {
  ready: "bg-emerald-500/[0.15] text-emerald-300 ring-emerald-500/30",
  processing: "bg-cyan-500/[0.15] text-cyan-300 ring-cyan-500/30",
  running: "bg-cyan-500/[0.15] text-cyan-300 ring-cyan-500/30",
  uploaded: "bg-amber-500/[0.15] text-amber-300 ring-amber-500/30",
  draft: "bg-white/[0.08] text-white/70 ring-white/10",
  reviewed: "bg-sky-500/[0.15] text-sky-300 ring-sky-500/30",
  published: "bg-emerald-500/[0.15] text-emerald-300 ring-emerald-500/30",
  failed: "bg-rose-500/[0.15] text-rose-300 ring-rose-500/30"
};

export function StatusBadge({ label, displayLabel }: StatusBadgeProps) {
  const styles = colorMap[label] ?? "bg-white/10 text-white/70 ring-white/10";
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] ring-1 ${styles}`}>
      {displayLabel ?? label}
    </span>
  );
}
