export interface DimensionInsightItem {
  dimension: string;
  score: number;
  weightPct: number;
  headline: string;
  whyItMatters: string;
  keywords: string[];
}

export default function DimensionInsightList({
  items,
  tone,
}: {
  items: DimensionInsightItem[];
  tone: "positive" | "negative";
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        {tone === "positive" ? "No standout strengths detected." : "No significant concerns detected."}
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.dimension} className="text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium text-zinc-900">{item.dimension}</span>
            <span className="text-xs text-zinc-400 shrink-0">
              {item.score}/100 · {item.weightPct}% weight
            </span>
          </div>
          <p className="text-zinc-700 mt-0.5">{item.headline}</p>
          {item.whyItMatters && (
            <p className="text-zinc-500 mt-1 text-xs">
              <span className={tone === "positive" ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                Why it matters:
              </span>{" "}
              {item.whyItMatters}
            </p>
          )}
          {item.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {item.keywords.map((kw) => (
                <span
                  key={kw}
                  className="text-[11px] bg-zinc-100 text-zinc-600 rounded px-1.5 py-0.5"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
