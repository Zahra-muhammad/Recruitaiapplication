// Runs AI scoring for a saved candidate and stores the result. A CV is
// saved first (scoringStatus PENDING) and scored after the response is
// sent, so applicants and recruiters never wait on the AI. Any failure is
// recorded as FAILED with a reason — no fallback score is ever written.

import { createHash } from "crypto";
import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SCORING_MODEL, AiCallError } from "@/lib/ai/claude";
import { getJobRubric } from "@/lib/jobRubric";
import { detectGenericApplication, scoreCv, SCORING_VERSION, type ScoringDetails, type ScoringResult } from "@/lib/scoring";

// A PENDING candidate older than this was cut off mid-scoring (e.g. the
// serverless function timed out) and is shown as failed with a retry.
export const STALE_PENDING_MS = 10 * 60 * 1000;
const CONCURRENCY = 3;

export function isScoringStale(c: { scoringStatus: string; scoringStartedAt: Date | null; uploadedAt: Date }): boolean {
  return c.scoringStatus === "PENDING" && Date.now() - (c.scoringStartedAt ?? c.uploadedAt).getTime() > STALE_PENDING_MS;
}

// "LAYLA HADDAD" → "Layla Haddad"; mixed-case names are left as written.
function tidyName(name: string): string {
  const clean = name.replace(/\s+/g, " ").trim();
  if (clean !== clean.toUpperCase()) return clean;
  return clean.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());
}

const sameName = (a: string, b: string) => a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();

function evaluationData(result: ScoringResult, inputHash: string) {
  return {
    totalScore: result.totalScore,
    verdict: result.verdict,
    mustHaveScore: result.parts.mustHaves,
    experienceScore: result.parts.experience,
    niceToHaveScore: result.parts.niceToHaves,
    otherScore: result.parts.other,
    overqualified: result.overqualified,
    keywordStuffing: result.keywordStuffing,
    summary: result.summary,
    strengths: JSON.stringify(result.strengths),
    concerns: JSON.stringify(result.concerns),
    potential: "[]",
    details: JSON.stringify(result.details),
    inputHash,
    scoringVersion: SCORING_VERSION,
    evaluatedAt: new Date(),
  } satisfies Prisma.EvaluationUncheckedUpdateInput;
}

const REUSED_FIELDS = {
  totalScore: true, verdict: true, mustHaveScore: true, experienceScore: true, niceToHaveScore: true,
  otherScore: true, overqualified: true, keywordStuffing: true, summary: true, strengths: true,
  concerns: true, details: true,
} as const;

function userFacingError(err: unknown): string {
  if (err instanceof AiCallError) return err.message;
  if (err instanceof Error && err.message.length < 200) return err.message;
  return "Something went wrong while scoring this CV.";
}

export async function runScoring(candidateId: string): Promise<void> {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { job: { include: { company: { select: { name: true } } } } },
  });
  if (!candidate) return;

  await prisma.candidate.update({
    where: { id: candidateId },
    data: { scoringStatus: "PENDING", scoringError: null, scoringStartedAt: new Date() },
  });

  try {
    const rubric = await getJobRubric(candidate.job);
    const inputHash = createHash("sha256")
      .update(JSON.stringify([SCORING_VERSION, SCORING_MODEL, rubric, candidate.extractedText]))
      .digest("hex");

    // Identical CV text + identical rubric → identical result, without
    // asking the model again.
    const previous = await prisma.evaluation.findFirst({
      where: { inputHash, scoringVersion: SCORING_VERSION, candidate: { job: { companyId: candidate.job.companyId } } },
      select: REUSED_FIELDS,
    });

    let data: ReturnType<typeof evaluationData>;
    let cvName: string | null;
    let cvEmail: string | null = null;
    let cvPhone: string | null = null;
    if (previous) {
      console.info(`[score] reusing stored result for identical input (candidate ${candidateId})`);
      data = { ...previous, potential: "[]", inputHash, scoringVersion: SCORING_VERSION, evaluatedAt: new Date() };
      cvName = (JSON.parse(previous.details) as ScoringDetails).profile.fullName;
    } else {
      const result = await scoreCv(candidate.extractedText, rubric);
      data = evaluationData(result, inputHash);
      cvName = result.contact.fullName;
      cvEmail = result.contact.email;
      cvPhone = result.contact.phone;
    }

    const generic = detectGenericApplication(candidate.extractedText, candidate.job, candidate.coverNote);
    const scored = { ...data, genericFlag: generic.flagged, genericReasons: JSON.stringify(generic.reasons) };

    // Name comes from the CV; a different name typed on the form is kept.
    const nameUpdate: Prisma.CandidateUpdateInput = {};
    if (cvName && !sameName(cvName, candidate.name)) {
      nameUpdate.name = tidyName(cvName);
      if (candidate.source === "APPLIED") nameUpdate.formName = candidate.formName ?? candidate.name;
    }
    if (!candidate.email && cvEmail) nameUpdate.email = cvEmail.toLowerCase();
    if (!candidate.phone && cvPhone) nameUpdate.phone = cvPhone;

    await prisma.$transaction([
      prisma.evaluation.upsert({
        where: { candidateId },
        // Recruiter notes, overrides and interview questions survive a rescore.
        update: scored,
        create: { candidateId, ...scored },
      }),
      prisma.candidate.update({
        where: { id: candidateId },
        data: { ...nameUpdate, scoringStatus: "SCORED", scoringError: null },
      }),
    ]);
  } catch (err) {
    console.error(`[score] candidate ${candidateId} failed`, err);
    await prisma.candidate.update({
      where: { id: candidateId },
      data: { scoringStatus: "FAILED", scoringError: userFacingError(err) },
    });
  }
}

export async function runScoringBatch(candidateIds: string[]): Promise<void> {
  const queue = [...candidateIds];
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) await runScoring(id);
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
}

// Schedules scoring to run after the current response is sent (Vercel
// keeps the function alive for it). Only call inside a request.
export function scoreInBackground(candidateIds: string[]): void {
  if (candidateIds.length === 0) return;
  after(() => runScoringBatch(candidateIds));
}
