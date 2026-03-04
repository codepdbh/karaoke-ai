type StatusBadgeProps = {
  label: string;
};

const colorMap: Record<string, string> = {
  ready: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  processing: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  running: "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30",
  uploaded: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  draft: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
  reviewed: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
  published: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  failed: "bg-rose-500/15 text-rose-300 ring-rose-500/30"
};

export function StatusBadge({ label }: StatusBadgeProps) {
  const styles = colorMap[label] ?? "bg-white/10 text-white/70 ring-white/10";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ring-1 ${styles}`}>
      {label}
    </span>
  );
}

