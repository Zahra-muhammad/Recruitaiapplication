import {
  FUNNEL_STAGE_LABELS,
  MIN_DECISIONS_TO_COMPARE,
  type FunnelAudit,
} from "@/lib/funnelAudit";

// Aggregate stage view of one job's hiring funnel. Deliberately shows counts
// and rates only — never individuals, never demographic data.
export default function FunnelAuditPanel({ audit }: { audit: FunnelAudit }) {
  const maxReached = Math.max(audit.total, 1);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-5">
      <div className="space-y-2.5">
        {audit.stages.map((s) => (
          <div key={s.stage} className="grid grid-cols-[110px_1fr_90px] items-center gap-3 text-sm">
            <span className="text-zinc-600">{FUNNEL_STAGE_LABELS[s.stage]}</span>
            <div className="h-2.5 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(s.reached / maxReached) * 100}%` }} />
            </div>
            <span className="text-right tabular-nums text-zinc-700">
              {s.reached} <span className="text-zinc-400">({s.pctOfTotal}%)</span>
            </span>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-xs font-medium text-zinc-500 mb-2">Pass-through at each stage</h3>
        <ul className="divide-y divide-zinc-100">
          {audit.transitions.map((t) => {
            const decided = t.advanced + t.notMovingForward;
            return (
              <li key={t.from} className="py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-zinc-700">
                    {FUNNEL_STAGE_LABELS[t.from]} → {FUNNEL_STAGE_LABELS[t.to]}
                  </span>
                  <span className={`tabular-nums font-medium ${t.flagged ? "text-amber-700" : "text-zinc-900"}`}>
                    {t.passThroughRate === null ? "—" : `${Math.round(t.passThroughRate * 100)}%`}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {t.advanced} advanced · {t.notMovingForward} not moving forward
                  {t.pending > 0 && ` · ${t.pending} awaiting a decision`}
                  {decided > 0 && decided < MIN_DECISIONS_TO_COMPARE && " · too few decisions to compare yet"}
                </p>
                {t.flagged && (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5 mt-1.5">
                    This stage has a notably lower pass-through rate — worth reviewing your criteria here.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-[11px] text-zinc-400">
        Aggregate stage counts only. Rates count decided candidates (advanced or not moving forward), not those
        still waiting. No demographic or personal characteristics are collected or used.
        {!audit.hasEnoughDataToCompare &&
          ` Stages are compared once at least two have ${MIN_DECISIONS_TO_COMPARE}+ decisions.`}
      </p>
    </div>
  );
}
