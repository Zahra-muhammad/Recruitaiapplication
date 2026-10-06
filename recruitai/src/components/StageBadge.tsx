const STAGE_LABELS: Record<string, string> = {
  pre_product: "Pre-product",
  early_users: "Early users",
  scaling: "Scaling",
};

const STAGE_STYLES: Record<string, string> = {
  pre_product: "bg-violet-50 text-violet-700 border-violet-200",
  early_users: "bg-amber-50 text-amber-700 border-amber-200",
  scaling: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function StageBadge({ stage }: { stage: string }) {
  const style = STAGE_STYLES[stage] ?? "bg-zinc-100 text-zinc-700 border-zinc-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style}`}
    >
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}
