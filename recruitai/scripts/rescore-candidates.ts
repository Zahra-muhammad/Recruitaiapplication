// Re-scores stored candidates with the current AI scorer — use after
// changing prompts or scoring rules, or to upgrade rows scored by the old
// keyword scorer. Recruiter notes, manual verdict overrides and interview
// questions are preserved. Needs ANTHROPIC_API_KEY and DATABASE_URL.
//
//   npx tsx scripts/rescore-candidates.ts              (only legacy, failed or stuck candidates)
//   npx tsx scripts/rescore-candidates.ts --all        (every candidate — costs one AI run each)
//   npx tsx scripts/rescore-candidates.ts --job <id>   (limit to one job)

import { prisma } from "../src/lib/prisma";
import { runScoringBatch } from "../src/lib/scoringRun";
import { SCORING_VERSION } from "../src/lib/scoring";

const all = process.argv.includes("--all");
const jobArg = process.argv.indexOf("--job");
const jobId = jobArg > -1 ? process.argv[jobArg + 1] : undefined;

async function main() {
  const candidates = await prisma.candidate.findMany({
    where: {
      ...(jobId ? { jobId } : {}),
      ...(all
        ? {}
        : {
            OR: [
              { scoringStatus: { not: "SCORED" } },
              { evaluation: { is: null } },
              { evaluation: { scoringVersion: { not: SCORING_VERSION } } },
            ],
          }),
    },
    include: { evaluation: { select: { totalScore: true, verdict: true } } },
    orderBy: [{ jobId: "asc" }, { name: "asc" }],
  });
  console.log(`Scoring ${candidates.length} candidate(s)…`);

  await runScoringBatch(candidates.map((c) => c.id));

  const after = await prisma.candidate.findMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    include: { evaluation: { select: { totalScore: true, verdict: true } }, job: { select: { title: true } } },
    orderBy: [{ jobId: "asc" }, { name: "asc" }],
  });
  const before = new Map(candidates.map((c) => [c.id, c.evaluation]));
  for (const c of after) {
    const b = before.get(c.id);
    const now = c.scoringStatus === "SCORED" && c.evaluation
      ? `${String(c.evaluation.totalScore).padStart(3)} ${c.evaluation.verdict}`
      : `FAILED: ${c.scoringError}`;
    console.log(
      `${c.job.title.slice(0, 24).padEnd(24)} ${c.name.slice(0, 22).padEnd(22)} ` +
        `${b ? `${String(b.totalScore).padStart(3)} ${b.verdict.padEnd(14)}` : "  — (none)        "} -> ${now}`
    );
  }
}

main().finally(() => prisma.$disconnect());
