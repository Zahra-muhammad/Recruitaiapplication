const BUCKETS = [
  [0, 10],
  [10, 20],
  [20, 30],
  [30, 40],
  [40, 50],
  [50, 60],
  [60, 70],
  [70, 80],
  [80, 90],
  [90, 101],
] as const;

export default function ScoreHistogram({ scores, height = 100 }: { scores: number[]; height?: number }) {
  if (scores.length === 0) {
    return <p className="text-sm text-zinc-400">No scored candidates yet.</p>;
  }

  const counts = BUCKETS.map(([lo, hi]) => scores.filter((s) => s >= lo && s < hi).length);
  const max = Math.max(...counts, 1);

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {BUCKETS.map(([lo], i) => {
          const count = counts[i];
          const barHeight = Math.max(Math.round((count / max) * (height - 18)), count > 0 ? 4 : 1);
          const hi = Math.min(lo + 10, 100);
          return (
            <div key={lo} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
              <span className="text-[10px] text-zinc-500 font-medium">{count > 0 ? count : ""}</span>
              <div
                className="w-full bg-indigo-500 rounded-t-sm hover:bg-indigo-600 transition-colors"
                style={{ height: barHeight }}
                title={`${lo}-${hi}: ${count} candidate${count === 1 ? "" : "s"}`}
              />
              <span className="text-[9px] text-zinc-400">{lo}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-zinc-400 mt-1 text-center">Score (0–100)</p>
    </div>
  );
}
