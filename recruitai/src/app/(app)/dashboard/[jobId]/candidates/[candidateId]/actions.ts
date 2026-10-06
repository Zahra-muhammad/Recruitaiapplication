"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { applyStatusChange } from "@/lib/candidateStatus";
import { generateInterviewQuestions, type InterviewQuestion } from "@/lib/interviewQuestions";
import type { Verdict } from "@prisma/client";

const VALID_VERDICTS: Verdict[] = ["COMPATIBLE", "BORDERLINE", "NOT_COMPATIBLE"];

async function findCompanyCandidate(candidateId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, job: { companyId: session.user.companyId } },
    include: { job: true },
  });
  if (!candidate) throw new Error("Candidate not found");
  return candidate;
}

const MAX_SAVED_QUESTIONS = 15;
const MAX_QUESTION_LENGTH = 1000;

// Generates questions from this candidate's gaps and saves them straight
// away, so a reload never loses them. The recruiter edits from there.
export async function generateCandidateInterviewQuestions(
  jobId: string,
  candidateId: string
): Promise<InterviewQuestion[]> {
  const candidate = await findCompanyCandidate(candidateId);
  const questions = generateInterviewQuestions(candidate.extractedText, candidate.job);

  await prisma.evaluation.update({
    where: { candidateId },
    data: { interviewQuestions: JSON.stringify(questions) },
  });
  revalidatePath(`/dashboard/${jobId}/candidates/${candidateId}`);
  return questions;
}

export async function saveCandidateInterviewQuestions(
  jobId: string,
  candidateId: string,
  questions: InterviewQuestion[]
) {
  await findCompanyCandidate(candidateId);

  const cleaned = (Array.isArray(questions) ? questions : [])
    .map((q) => ({
      question: String(q?.question ?? "").trim().slice(0, MAX_QUESTION_LENGTH),
      reason: String(q?.reason ?? "").trim().slice(0, 300),
    }))
    .filter((q) => q.question)
    .slice(0, MAX_SAVED_QUESTIONS);

  await prisma.evaluation.update({
    where: { candidateId },
    data: { interviewQuestions: JSON.stringify(cleaned) },
  });
  revalidatePath(`/dashboard/${jobId}/candidates/${candidateId}`);
}

export async function updateEvaluation(
  jobId: string,
  candidateId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, job: { companyId: session.user.companyId } },
  });
  if (!candidate) throw new Error("Candidate not found");

  const overrideRaw = String(formData.get("manualVerdictOverride") || "");
  const notes = String(formData.get("notes") || "");

  const manualVerdictOverride = VALID_VERDICTS.includes(overrideRaw as Verdict)
    ? (overrideRaw as Verdict)
    : null;

  await prisma.evaluation.update({
    where: { candidateId },
    data: { manualVerdictOverride, notes },
  });

  revalidatePath(`/dashboard/${jobId}/candidates/${candidateId}`);
  revalidatePath(`/dashboard/${jobId}`);
}

// One-click status change — auth and cache revalidation only; the logic
// lives in applyStatusChange so it can be exercised outside a request.
export async function setCandidateStatus(
  jobId: string,
  candidateId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const { statusToken } = await applyStatusChange({
    candidateId,
    companyId: session.user.companyId,
    status: String(formData.get("status") || ""),
    message: String(formData.get("message") || ""),
    actor: { id: session.user.id, name: session.user.name ?? "Recruiter" },
  });

  revalidatePath(`/dashboard/${jobId}/candidates/${candidateId}`);
  revalidatePath(`/dashboard/${jobId}`);
  revalidatePath(`/applications/${statusToken}`);
}
