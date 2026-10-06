// Prints how a candidate's score is built: each dimension's raw 0-100 score,
// what it matched in the CV, its weight, and its contribution to the total.
//
//   npx tsx scripts/explain-score.ts "Aisha Rahman"

import { PrismaClient } from "@prisma/client";
import { scoreCandidate, SCORING_WEIGHTS } from "../src/lib/scoring";

const prisma = new PrismaClient();

async function main() {
  const name = process.argv[2];
  if (!name) throw new Error('Usage: npx tsx scripts/explain-score.ts "Candidate Name"');

  const candidate = await prisma.candidate.findFirst({ where: { name }, include: { job: true } });
  if (!candidate) throw new Error(`No candidate named "${name}"`);

  const e = scoreCandidate(candidate.extractedText, candidate.job);
  const rows: [string, number, number][] = [
    ["Skills match with job", e.skillsMatchScore, SCORING_WEIGHTS.skillsMatch],
    ["0→1 building / ownership", e.buildingScore, SCORING_WEIGHTS.building],
    ["Startup / ambiguity tolerance", e.startupToleranceScore, SCORING_WEIGHTS.startupTolerance],
    ["Track record of impact", e.trackRecordScore, SCORING_WEIGHTS.trackRecord],
    ["Red flags (100 − deductions)", e.redFlagScore, SCORING_WEIGHTS.redFlags],
  ];

  console.log(`\n${candidate.name} — ${candidate.job.title}\n`);
  console.log("Dimension                        raw/100   weight   contribution");
  let sum = 0;
  for (const [label, raw, weight] of rows) {
    const contribution = raw * weight;
    sum += contribution;
    console.log(
      `${label.padEnd(32)} ${String(raw).padStart(5)}    ${(weight * 100).toFixed(0).padStart(4)}%    ${contribution.toFixed(1).padStart(8)}`
    );
  }
  const weightTotal = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
  console.log(`${"".padEnd(32)} ${"".padStart(5)}    ${(weightTotal * 100).toFixed(0).padStart(4)}%    ${sum.toFixed(1).padStart(8)}`);
  console.log(`\nTotal: ${e.totalScore}/100 → ${e.verdict}\n`);

  for (const d of e.dimensionDetails) {
    console.log(`• ${d.dimension}: ${d.headline}${d.keywords.length ? `\n    matched: ${d.keywords.join(" | ")}` : ""}`);
  }
}

main().finally(() => prisma.$disconnect());
