// "What would strengthen this application" — for a BORDERLINE candidate,
// works out which specific gaps are costing them the most points and how
// much closing each would be worth, using the real scoring weights. Every
// suggestion names the candidate's actual gap (a missing requirement, a
// flagged issue) — nothing generic.

import type { Job } from "@prisma/client";
import { scoreCandidate, SCORING_WEIGHTS } from "@/lib/scoring";
import { matchRequirements } from "@/lib/requirements";

export const COMPATIBLE_THRESHOLD = 70;

export interface GapSuggestion {
  gap: string; // what's missing, specific to this candidate
  detail: string; // why it matters / what to look for
  estimatedPoints: number; // score gain if this gap were closed
}

export interface GapAnalysis {
  currentScore: number;
  pointsNeeded: number;
  suggestions: GapSuggestion[];
  // Estimated score if every listed suggestion were addressed.
  projectedScore: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function analyzeGaps(cvText: string, job: Job): GapAnalysis {
  const evaluation = scoreCandidate(cvText, job);
  const byDimension = new Map(evaluation.dimensionDetails.map((d) => [d.dimension, d]));
  const all: GapSuggestion[] = [];

  // 1. Each missing job requirement is worth an equal share of the skills weight.
  const { matched, missing } = matchRequirements(cvText, job.keySkills);
  const reqCount = matched.length + missing.length;
  if (reqCount > 0) {
    const perRequirement = (100 / reqCount) * SCORING_WEIGHTS.skillsMatch;
    for (const req of missing) {
      all.push({
        gap: `Missing requirement: "${req}"`,
        detail: "Nothing in the CV matches this. If they do have it, it may just be unstated — worth asking directly.",
        estimatedPoints: perRequirement,
      });
    }
  }

  // 2. Weak dimensions — estimated as what one or two more concrete signals
  //    would add, capped at the dimension's maximum.
  const building = byDimension.get("0→1 building evidence");
  if (building && building.score < 60) {
    const gain = (Math.min(100, building.score + 28) - building.score) * SCORING_WEIGHTS.building;
    all.push({
      gap:
        building.keywords.length === 0
          ? "No evidence of building or owning something end to end"
          : `Thin ownership evidence (only: ${building.keywords.join(", ")})`,
      detail:
        "A concrete example of launching, founding, or owning a project, budget, or function from scratch would count here.",
      estimatedPoints: gain,
    });
  }

  const startup = byDimension.get("Startup/ambiguity tolerance");
  if (startup && startup.score < 60) {
    const bigCorp = startup.headline.match(/big-corp-only signal\(s\) \(([^)]+)\)/)?.[1];
    const gain = (Math.min(100, startup.score + 24) - startup.score) * SCORING_WEIGHTS.startupTolerance;
    all.push({
      gap: bigCorp
        ? `Background reads as large-company / process-heavy (${bigCorp.split(", ").slice(0, 3).join(", ")})`
        : "No evidence of working in a small team or ambiguous environment",
      detail: "Any time spent in a small team, early-stage company, or role without a set process would count here.",
      estimatedPoints: gain,
    });
  }

  const track = byDimension.get("Track record of measurable impact");
  if (track && track.score < 60) {
    const gain = (Math.min(100, track.score + 21) - track.score) * SCORING_WEIGHTS.trackRecord;
    all.push({
      gap:
        track.keywords.length === 0
          ? "No quantified results anywhere in the CV"
          : `Few quantified results (only: ${track.keywords.slice(0, 4).join(", ")})`,
      detail: "Numbers on outcomes they drove — %, revenue, users, time saved, before → after — would count here.",
      estimatedPoints: gain,
    });
  }

  // 3. Red-flag deductions, each named. (Skip "no skill overlap" — the
  //    missing-requirement suggestions above already cover it.)
  const DEDUCTIONS: [RegExp, number][] = [
    [/No self-directed projects/, 25],
    [/Only large-team experience/, 20],
    [/Skill list reads as generic/, 15],
  ];
  for (const flag of evaluation.dimensionDetails.find((d) => d.dimension === "Red flags")?.keywords ?? []) {
    const deduction = DEDUCTIONS.find(([re]) => re.test(flag));
    if (!deduction) continue;
    all.push({
      gap: flag.replace(/\.$/, ""),
      detail: "Flagged by the red-flag check; resolving it removes the deduction.",
      estimatedPoints: deduction[1] * SCORING_WEIGHTS.redFlags,
    });
  }

  all.sort((a, b) => b.estimatedPoints - a.estimatedPoints);

  const pointsNeeded = Math.max(0, COMPATIBLE_THRESHOLD - evaluation.totalScore);
  // Take the biggest gaps until they'd cover the shortfall (at most 4).
  const suggestions: GapSuggestion[] = [];
  let covered = 0;
  for (const s of all) {
    if (suggestions.length >= 4 || (covered >= pointsNeeded && suggestions.length > 0)) break;
    suggestions.push({ ...s, estimatedPoints: round1(s.estimatedPoints) });
    covered += s.estimatedPoints;
  }

  return {
    currentScore: evaluation.totalScore,
    pointsNeeded,
    suggestions,
    projectedScore: Math.min(100, Math.round(evaluation.totalScore + covered)),
  };
}
