"use server";

import { auth } from "@/auth";
import { searchJobPipeline, type PipelineSearchResult } from "@/lib/pipelineSearch";

export async function searchPipeline(jobId: string, query: string): Promise<PipelineSearchResult> {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const trimmed = query.trim().slice(0, 300);
  if (!trimmed) throw new Error("Type a question first.");

  return searchJobPipeline(jobId, session.user.companyId, trimmed);
}
