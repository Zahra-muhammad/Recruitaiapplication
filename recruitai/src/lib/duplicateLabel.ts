import { prisma } from "@/lib/prisma";

export interface DuplicateInfo {
  label: string;
  href: string;
}

// Human-readable "possible duplicate" notes for a set of candidates, keyed by
// candidate id. Same job reads as a likely duplicate; a different job reads
// as the same CV also sent to another role (which can be legitimate).
export async function describeDuplicates(
  companyId: string,
  candidates: { id: string; jobId: string; duplicateOfId: string | null; duplicateSimilarity: number | null }[]
): Promise<Map<string, DuplicateInfo>> {
  const ids = [...new Set(candidates.map((c) => c.duplicateOfId).filter((id): id is string => !!id))];
  if (ids.length === 0) return new Map();

  const originals = await prisma.candidate.findMany({
    where: { id: { in: ids }, job: { companyId } },
    select: { id: true, name: true, jobId: true, job: { select: { title: true } } },
  });
  const byId = new Map(originals.map((o) => [o.id, o]));

  const out = new Map<string, DuplicateInfo>();
  for (const c of candidates) {
    const original = c.duplicateOfId ? byId.get(c.duplicateOfId) : undefined;
    if (!original) continue;
    const pct = Math.round((c.duplicateSimilarity ?? 0) * 100);
    out.set(c.id, {
      label:
        original.jobId === c.jobId
          ? `Possible duplicate application — ${pct}% CV match with ${original.name}'s earlier application to this job`
          : `Same CV (${pct}% match) also submitted by ${original.name} for ${original.job.title}`,
      href: `/dashboard/${original.jobId}/candidates/${original.id}`,
    });
  }
  return out;
}
