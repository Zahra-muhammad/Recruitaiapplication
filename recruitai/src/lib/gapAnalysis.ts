// "What would strengthen this application" — for a BORDERLINE candidate,
// works out which specific gaps are costing the most points and how much
// closing each would be worth, using the stored AI evaluation and the real
// rubric weights. Every suggestion names the candidate's actual gap.

import { COMPATIBLE_THRESHOLD, RUBRIC_WEIGHTS, type ScoringDetails } from "@/lib/scoring";

export { COMPATIBLE_THRESHOLD };

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

const EVIDENCE_HINT: Record<string, string> = {
  skills_list_only: "It's only listed as a skill — no role shows it being used. Ask for a concrete example.",
  none: "Nothing in the CV shows this. If they have it, it may just be unstated — worth asking directly.",
};

export function analyzeGaps(details: ScoringDetails, currentScore: number): GapAnalysis {
  const all: GapSuggestion[] = [];

  const perMustHave = RUBRIC_WEIGHTS.mustHaves / Math.max(1, details.mustHaves.length);
  for (const r of details.mustHaves) {
    if (r.credit >= 1) continue;
    all.push({
      gap: `${r.demonstrated ? "Limited evidence" : "Missing must-have"}: "${r.requirement}"`,
      detail: EVIDENCE_HINT[r.evidenceType] ?? r.evidence,
      estimatedPoints: perMustHave * (1 - r.credit),
    });
  }

  const { relevantYears, requiredYears } = details.experience;
  if (requiredYears > 0 && relevantYears < requiredYears) {
    all.push({
      gap: `${relevantYears} of ${requiredYears} required years of relevant experience`,
      detail: "Relevant work not described on the CV (freelance, earlier roles, overlapping projects) would count here.",
      estimatedPoints: RUBRIC_WEIGHTS.experience * (1 - relevantYears / requiredYears),
    });
  }

  const perNiceToHave = RUBRIC_WEIGHTS.niceToHaves / Math.max(1, details.niceToHaves.length);
  for (const r of details.niceToHaves) {
    if (r.credit >= 0.5) continue;
    all.push({
      gap: `Nice-to-have not shown: "${r.requirement}"`,
      detail: EVIDENCE_HINT[r.evidenceType] ?? r.evidence,
      estimatedPoints: perNiceToHave * (1 - r.credit),
    });
  }

  all.sort((a, b) => b.estimatedPoints - a.estimatedPoints);

  const pointsNeeded = Math.max(0, COMPATIBLE_THRESHOLD - currentScore);
  // Take the biggest gaps until they'd cover the shortfall (at most 4).
  const suggestions: GapSuggestion[] = [];
  let covered = 0;
  for (const s of all) {
    if (suggestions.length >= 4 || (covered >= pointsNeeded && suggestions.length > 0)) break;
    suggestions.push({ ...s, estimatedPoints: round1(s.estimatedPoints) });
    covered += s.estimatedPoints;
  }

  return {
    currentScore,
    pointsNeeded,
    suggestions,
    projectedScore: Math.min(100, Math.round(details.rawScore + covered)),
  };
}
