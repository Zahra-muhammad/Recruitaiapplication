const SEGMENTS = [
  { key: "applied", label: "Applied", color: "bg-blue-500", text: "text-blue-700" },
  { key: "uploaded", label: "Uploaded by recruiter", color: "bg-zinc-400", text: "text-zinc-600" },
] as const;

export default function SourceBreakdownBar({
  applied,
  uploaded,
}: {
  applied: number;
  uploaded: number;
}) {
  const total = applied + uploaded;

  if (total === 0) {
    return <p className="text-sm text-zinc-400">No candidates yet.</p>;
  }

  const values: Record<(typeof SEGMENTS)[number]["key"], number> = { applied, uploaded };
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <div>
      <div className="flex h-4 rounded-full overflow-hidden bg-zinc-100 gap-0.5">
        {SEGMENTS.map((s) => {
          const value = values[s.key];
          if (value === 0) return null;
          return (
            <div
              key={s.key}
              className={`${s.color} h-full first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${(value / total) * 100}%` }}
              title={`${s.label}: ${value} (${pct(value)}%)`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs">
        {SEGMENTS.map((s) => {
          const value = values[s.key];
          return (
            <div key={s.key} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              <span className={`font-medium ${s.text}`}>{value}</span>
              <span className="text-zinc-500">
                {s.label} ({pct(value)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
