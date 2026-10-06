// Recruiter talent search: candidates who switched on "Open to work",
// ranked for one of the recruiter's jobs with the same AI scorer used for
// applications. Scores are only computed on request (each costs an AI
// run) and then stored, so the list loads instantly afterwards.

import type { Job } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cityByKey, cityFromText, cityLabel, distanceKm } from "@/lib/cities";
import { missingProfileParts, profileAsCvText, type FullProfile } from "@/lib/applicantProfile";
import { matchRequirements } from "@/lib/requirements";
import { cachedScore } from "@/lib/scoringRun";
import { BORDERLINE_THRESHOLD, type ScoringResult } from "@/lib/scoring";

export interface TalentRow {
  applicantId: string;
  name: string;
  headline: string;
  place: string | null;
  distanceKm: number | null;
  skills: string[];
  score: ScoringResult | null;
  // Rough keyword overlap used only to order not-yet-scored candidates.
  quickMatch: number;
  applied: boolean;
  invited: boolean;
}

export interface TalentFilters {
  radiusKm: number | null; // null = anywhere
}

const POOL_LIMIT = 200;

export async function openToWorkProfiles(): Promise<FullProfile[]> {
  const rows = await prisma.applicant.findMany({
    where: { openToWork: true },
    include: {
      experiences: { orderBy: { sortOrder: "asc" } },
      educations: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { profileUpdatedAt: "desc" },
    take: POOL_LIMIT,
  });
  // Only complete profiles are searchable.
  return rows.filter((p) => missingProfileParts(p).length === 0);
}

export async function searchTalent(job: Job, filters: TalentFilters): Promise<TalentRow[]> {
  const jobCity = cityFromText(job.location);
  const profiles = await openToWorkProfiles();

  const [applied, invited] = await Promise.all([
    prisma.candidate.findMany({ where: { jobId: job.id, applicantId: { not: null } }, select: { applicantId: true } }),
    prisma.jobInvite.findMany({ where: { jobId: job.id }, select: { applicantId: true } }),
  ]);
  const appliedIds = new Set(applied.map((a) => a.applicantId));
  const invitedIds = new Set(invited.map((i) => i.applicantId));

  const rows: TalentRow[] = [];
  for (const p of profiles) {
    const city = cityByKey(p.city);
    const distance = city && jobCity ? distanceKm(city, jobCity) : null;
    if (filters.radiusKm !== null && (distance === null || distance > filters.radiusKm)) continue;

    const text = profileAsCvText(p);
    const { matched, missing } = matchRequirements(text, job.keySkills);
    const total = matched.length + missing.length;
    rows.push({
      applicantId: p.id,
      name: p.name,
      headline: p.headline ?? "",
      place: city ? cityLabel(city) : p.location,
      distanceKm: distance,
      skills: (p.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8),
      score: await cachedScore(text, job),
      quickMatch: total ? matched.length / total : 0,
      applied: appliedIds.has(p.id),
      invited: invitedIds.has(p.id),
    });
  }

  // Scored first (best first), then unscored by keyword overlap.
  return rows.sort((a, b) => {
    if (a.score && b.score) return b.score.totalScore - a.score.totalScore;
    if (a.score) return -1;
    if (b.score) return 1;
    return b.quickMatch - a.quickMatch;
  });
}

export const isApplicable = (r: TalentRow) => !!r.score && r.score.totalScore >= BORDERLINE_THRESHOLD;
