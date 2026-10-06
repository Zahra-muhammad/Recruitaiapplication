import { prisma } from "@/lib/prisma";
import {
  parsePipelineQuery,
  matchesPipelineQuery,
  describePipelineQuery,
} from "@/lib/pipelineQuery";

export interface PipelineSearchResult {
  candidateIds: string[];
  interpretation: string[];
}

// Runs a natural-language query over one job's candidates. Always scoped to
// the recruiter's company. CV text stays on the server — only ids go back.
export async function searchJobPipeline(
  jobId: string,
  companyId: string,
  query: string
): Promise<PipelineSearchResult> {
  const parsed = parsePipelineQuery(query);
  const interpretation = describePipelineQuery(parsed);
  if (interpretation.length === 0) {
    throw new Error("Couldn't find anything to search for — try naming a skill, a score, or a status.");
  }

  const candidates = await prisma.candidate.findMany({
    where: { jobId, job: { companyId } },
    select: {
      id: true,
      extractedText: true,
      coverNote: true,
      qualifications: true,
      status: true,
      source: true,
      evaluation: {
        select: { totalScore: true, verdict: true, manualVerdictOverride: true, genericFlag: true },
      },
    },
  });

  const candidateIds = candidates
    .filter((c) => c.evaluation)
    .filter((c) =>
      matchesPipelineQuery(
        {
          id: c.id,
          text: [c.extractedText, c.coverNote, c.qualifications].filter(Boolean).join("\n"),
          score: c.evaluation!.totalScore,
          verdict: c.evaluation!.manualVerdictOverride ?? c.evaluation!.verdict,
          status: c.status,
          source: c.source,
          genericFlag: c.evaluation!.genericFlag,
        },
        parsed
      )
    )
    .map((c) => c.id);

  return { candidateIds, interpretation };
}
