// Re-runs scoreCandidate for every stored candidate — use after changing the
// scoring logic. Recruiter notes and manual verdict overrides are preserved.
//
//   npx tsx scripts/rescore-candidates.ts --dry-run   (print before/after only)
//   npx tsx scripts/rescore-candidates.ts             (write the new scores)

import { PrismaClient } from "@prisma/client";
import { scoreCandidate } from "../src/lib/scoring";
import { evaluationCreateInput } from "../src/lib/cvIntake";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const candidates = await prisma.candidate.findMany({
    where: { evaluation: { isNot: null } },
    include: { evaluation: true, job: { include: { company: { select: { name: true } } } } },
    orderBy: [{ jobId: "asc" }, { name: "asc" }],
  });

  let changed = 0;
  for (const c of candidates) {
    const before = c.evaluation!;
    const after = scoreCandidate(c.extractedText, c.job, { coverNote: c.coverNote });
    const verdictChanged = before.verdict !== after.verdict;
    if (before.totalScore !== after.totalScore || verdictChanged) changed++;

    console.log(
      `${c.job.title.slice(0, 24).padEnd(24)} ${c.name.slice(0, 20).padEnd(20)} ` +
        `${String(before.totalScore).padStart(3)} ${before.verdict.padEnd(14)} -> ` +
        `${String(after.totalScore).padStart(3)} ${after.verdict.padEnd(14)}` +
        `${verdictChanged ? " *" : ""}${before.manualVerdictOverride ? ` (override kept: ${before.manualVerdictOverride})` : ""}`
    );

    if (!dryRun) {
      // Omits notes and manualVerdictOverride, so they're left untouched.
      await prisma.evaluation.update({
        where: { candidateId: c.id },
        data: evaluationCreateInput(after),
      });
    }
  }

  console.log(
    `\n${candidates.length} candidates, ${changed} with a new score or verdict${dryRun ? " (dry run — nothing written)" : " — saved"}.`
  );
}

main().finally(() => prisma.$disconnect());
