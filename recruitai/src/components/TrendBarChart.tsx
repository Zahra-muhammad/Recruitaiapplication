export default function TrendBarChart({
  data,
  height = 96,
}: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const barHeight = Math.max(
          Math.round((d.value / max) * (height - 16)),
          d.value > 0 ? 4 : 1
        );
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
            <div
              className="w-full bg-gradient-to-t from-indigo-600 to-blue-400 rounded-t-sm hover:opacity-80 transition-opacity"
              style={{ height: barHeight }}
              title={`${d.label}: ${d.value}`}
            />
            <span className="text-[9px] text-zinc-400">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
