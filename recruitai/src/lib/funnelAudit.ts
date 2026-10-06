// Hiring funnel audit — aggregate stage data only. Uses nothing but each
// candidate's status and status history: no protected characteristics are
// collected, inferred, or stored, and no individual is scored. The point is
// to show where the funnel narrows sharply so the criteria at that stage can
// be reviewed.

export const FUNNEL_STAGES = ["RECEIVED", "IN_REVIEW", "INTERVIEWING", "OFFER", "HIRED"] as const;

export const FUNNEL_STAGE_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  IN_REVIEW: "In review",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  HIRED: "Hired",
};

// A stage needs at least this many decisions before its rate is compared.
export const MIN_DECISIONS_TO_COMPARE = 5;

export interface FunnelCandidateInput {
  status: string;
  history: { fromStatus: string | null; toStatus: string }[];
}

export interface FunnelStage {
  stage: string;
  reached: number; // candidates who ever got to this stage
  pctOfTotal: number;
}

export interface FunnelTransition {
  from: string;
  to: string;
  advanced: number;
  notMovingForward: number; // decided "no" at the `from` stage
  pending: number; // still sitting at the `from` stage, no decision yet
  passThroughRate: number | null; // advanced / decided; null if no decisions
  flagged: boolean;
}

export interface FunnelAudit {
  total: number;
  stages: FunnelStage[];
  transitions: FunnelTransition[];
  hasEnoughDataToCompare: boolean;
}

const stageIndex = (s: string | null) => (s ? FUNNEL_STAGES.indexOf(s as (typeof FUNNEL_STAGES)[number]) : -1);

// Furthest stage a candidate reached, and — if they're not moving forward —
// the stage where that decision was made.
function progress(c: FunnelCandidateInput): { reached: number; rejectedAt: number | null } {
  let reached = Math.max(0, stageIndex(c.status));
  for (const h of c.history) reached = Math.max(reached, stageIndex(h.toStatus), stageIndex(h.fromStatus));

  if (c.status !== "NOT_MOVING_FORWARD") return { reached, rejectedAt: null };
  const rejection = [...c.history].reverse().find((h) => h.toStatus === "NOT_MOVING_FORWARD");
  const at = rejection ? stageIndex(rejection.fromStatus) : -1;
  return { reached, rejectedAt: at >= 0 ? at : reached };
}

export function auditFunnel(candidates: FunnelCandidateInput[]): FunnelAudit {
  const rows = candidates.map(progress);
  const total = rows.length;

  const stages: FunnelStage[] = FUNNEL_STAGES.map((stage, i) => {
    const reached = rows.filter((r) => r.reached >= i).length;
    return { stage, reached, pctOfTotal: total ? Math.round((reached / total) * 100) : 0 };
  });

  const transitions: FunnelTransition[] = FUNNEL_STAGES.slice(0, -1).map((from, i) => {
    const advanced = rows.filter((r) => r.reached >= i + 1).length;
    const notMovingForward = rows.filter((r) => r.rejectedAt === i).length;
    const pending = rows.filter((r) => r.reached === i && r.rejectedAt === null).length;
    const decided = advanced + notMovingForward;
    return {
      from,
      to: FUNNEL_STAGES[i + 1],
      advanced,
      notMovingForward,
      pending,
      passThroughRate: decided > 0 ? advanced / decided : null,
      flagged: false,
    };
  });

  // Flag a stage whose pass-through is notably lower than the others: under
  // half the median of the other comparable stages, and at least 25 points
  // below it. Needs 2+ stages with enough decisions to compare at all.
  const comparable = transitions.filter(
    (t) => t.passThroughRate !== null && t.advanced + t.notMovingForward >= MIN_DECISIONS_TO_COMPARE
  );
  for (const t of comparable) {
    const others = comparable.filter((o) => o !== t).map((o) => o.passThroughRate!).sort((a, b) => a - b);
    if (others.length === 0) continue;
    const mid = Math.floor(others.length / 2);
    const median = others.length % 2 ? others[mid] : (others[mid - 1] + others[mid]) / 2;
    t.flagged = t.passThroughRate! < median * 0.5 && median - t.passThroughRate! >= 0.25;
  }

  return { total, stages, transitions, hasEnoughDataToCompare: comparable.length >= 2 };
}
