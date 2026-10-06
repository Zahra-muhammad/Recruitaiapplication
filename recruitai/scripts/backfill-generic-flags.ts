// One-off: computes the "possibly generic application" flag for evaluations
// created before the flag existed. Safe to re-run — only touches the two
// generic* columns, never the score or verdict.
//
//   npx tsx scripts/backfill-generic-flags.ts

import { PrismaClient } from "@prisma/client";
import { detectGenericApplication } from "../src/lib/scoring";

const prisma = new PrismaClient();

async function main() {
  const candidates = await prisma.candidate.findMany({
    where: { evaluation: { isNot: null } },
    include: { job: { include: { company: { select: { name: true } } } } },
  });

  let flagged = 0;
  for (const c of candidates) {
    const signal = detectGenericApplication(c.extractedText, c.job, c.coverNote);
    if (signal.flagged) flagged++;
    await prisma.evaluation.update({
      where: { candidateId: c.id },
      data: { genericFlag: signal.flagged, genericReasons: JSON.stringify(signal.reasons) },
    });
  }

  console.log(`Checked ${candidates.length} candidates, ${flagged} flagged as possibly generic.`);
}

main().finally(() => prisma.$disconnect());
