// One-off: sets the "possible duplicate application" link for candidates
// created before duplicate detection existed. Each candidate is compared only
// with EARLIER candidates at the same company, exactly as a new upload would
// be. Safe to re-run.
//
//   npx tsx scripts/backfill-duplicates.ts

import { PrismaClient } from "@prisma/client";
import { findDuplicateIn } from "../src/lib/duplicateDetection";

const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.candidate.findMany({
    select: { id: true, name: true, extractedText: true, uploadedAt: true, job: { select: { companyId: true, title: true } } },
    orderBy: { uploadedAt: "asc" },
  });

  let flagged = 0;
  for (const [i, c] of candidates.entries()) {
    const earlier = candidates.slice(0, i).filter((o) => o.job.companyId === c.job.companyId);
    const match = findDuplicateIn(c.extractedText, earlier);
    await prisma.candidate.update({
      where: { id: c.id },
      data: { duplicateOfId: match?.candidateId ?? null, duplicateSimilarity: match?.similarity ?? null },
    });
    if (match) {
      flagged++;
      const other = candidates.find((o) => o.id === match.candidateId)!;
      console.log(`  ${c.name} (${c.job.title}) ≈ ${other.name} (${other.job.title}) — ${Math.round(match.similarity * 100)}%`);
    }
  }
  console.log(`Checked ${candidates.length} candidates, ${flagged} flagged as possible duplicates.`);
}

main().finally(() => prisma.$disconnect());
