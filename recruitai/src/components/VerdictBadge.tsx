const VERDICT_LABELS: Record<string, string> = {
  COMPATIBLE: "Compatible",
  BORDERLINE: "Borderline",
  NOT_COMPATIBLE: "Not compatible",
};

const VERDICT_STYLES: Record<string, string> = {
  COMPATIBLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BORDERLINE: "bg-amber-50 text-amber-700 border-amber-200",
  NOT_COMPATIBLE: "bg-red-50 text-red-700 border-red-200",
};

export default function VerdictBadge({ verdict }: { verdict: string }) {
  const style = VERDICT_STYLES[verdict] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${style}`}
    >
      {VERDICT_LABELS[verdict] ?? verdict}
    </span>
  );
}
