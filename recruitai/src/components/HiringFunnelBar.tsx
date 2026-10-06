// Status-color bar: good=compatible, warning=borderline, critical=not-compatible.
// Legend is always present (never color-alone) with direct count+% labels,
// a 2px surface gap between segments, and rounded outer ends.
const SEGMENTS = [
  { key: "compatible", label: "Compatible", color: "bg-emerald-500", text: "text-emerald-700" },
  { key: "borderline", label: "Borderline", color: "bg-amber-400", text: "text-amber-700" },
  { key: "notCompatible", label: "Not compatible", color: "bg-red-400", text: "text-red-700" },
] as const;

export default function HiringFunnelBar({
  compatible,
  borderline,
  notCompatible,
}: {
  compatible: number;
  borderline: number;
  notCompatible: number;
}) {
  const total = compatible + borderline + notCompatible;

  if (total === 0) {
    return <p className="text-sm text-zinc-400">No scored candidates yet.</p>;
  }

  const values: Record<(typeof SEGMENTS)[number]["key"], number> = {
    compatible,
    borderline,
    notCompatible,
  };
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
