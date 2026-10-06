"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { searchJobPipeline, type PipelineSearchResult } from "@/lib/pipelineSearch";
import { scoreInBackground } from "@/lib/scoringRun";

export async function searchPipeline(jobId: string, query: string): Promise<PipelineSearchResult> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const trimmed = query.trim().slice(0, 300);
  if (!trimmed) throw new Error("Type a question first.");

  return searchJobPipeline(jobId, session.user.companyId, trimmed);
}

// Re-scores every candidate for this job with the current scorer, in the
// background. Notes, overrides and interview questions are kept.
export async function rescoreJob(jobId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const candidates = await prisma.candidate.findMany({
    where: { jobId, job: { companyId: session.user.companyId } },
    select: { id: true },
  });
  const ids = candidates.map((c) => c.id);
  await prisma.candidate.updateMany({
    where: { id: { in: ids } },
    data: { scoringStatus: "PENDING", scoringError: null, scoringStartedAt: new Date() },
  });
  scoreInBackground(ids);
  revalidatePath(`/dashboard/${jobId}`);
}
