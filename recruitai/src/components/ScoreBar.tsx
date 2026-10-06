function barColor(score: number): string {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default function ScoreBar({
  label,
  score,
  weight,
  headline,
  compareToAvg,
}: {
  label: string;
  score: number;
  weight: number;
  headline?: string;
  compareToAvg?: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium text-zinc-700">{label}</span>
        <span className="text-zinc-500">
          <span className="font-semibold text-zinc-900">{score}</span>/100
          <span className="text-zinc-400"> · {Math.round(weight * 100)}% weight</span>
          {typeof compareToAvg === "number" && (
            <span className={compareToAvg >= 0 ? "text-emerald-600" : "text-red-500"}>
              {" "}
              ({compareToAvg >= 0 ? "+" : ""}
              {compareToAvg} vs. job avg)
            </span>
          )}
        </span>
      </div>
      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {headline && <p className="mt-1 text-xs text-zinc-500">{headline}</p>}
    </div>
  );
}
