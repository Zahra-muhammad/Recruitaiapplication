// Prints how a stored candidate's score was built: each must-have and
// nice-to-have with its evidence, years of experience, caps and flags.
//
//   npx tsx scripts/explain-score.ts "Candidate Name"

import { prisma } from "../src/lib/prisma";
import { readScoringDetails } from "../src/lib/scoring";

async function main() {
  const name = process.argv[2];
  if (!name) throw new Error('Usage: npx tsx scripts/explain-score.ts "Candidate Name"');

  const candidate = await prisma.candidate.findFirst({ where: { name }, include: { evaluation: true } });
  if (!candidate) throw new Error(`No candidate named "${name}"`);
  if (!candidate.evaluation || candidate.scoringStatus !== "SCORED") {
    throw new Error(`Not scored (${candidate.scoringStatus}${candidate.scoringError ? `: ${candidate.scoringError}` : ""})`);
  }
  const e = candidate.evaluation;
  const d = readScoringDetails(e);
  if (!d) throw new Error("Scored by the old keyword scorer — run scripts/rescore-candidates.ts first.");

  console.log(`${candidate.name}: ${e.totalScore}/100 ${e.verdict} (raw ${d.rawScore}, model ${d.model})`);
  console.log(`Parts: must-haves ${e.mustHaveScore}, experience ${e.experienceScore}, nice-to-haves ${e.niceToHaveScore}, other ${e.otherScore}`);
  console.log(`Experience: ${d.experience.relevantYears} relevant / ${d.experience.totalYears} total years, ${d.experience.requiredYears} required`);
  for (const [label, list] of [["Must-haves", d.mustHaves], ["Nice-to-haves", d.niceToHaves]] as const) {
    console.log(`\n${label}:`);
    for (const r of list) console.log(`  [${r.level}/${r.evidenceType} ${r.credit.toFixed(2)}] ${r.requirement} — ${r.evidence}`);
  }
  if (d.caps.length) console.log(`\nCaps:\n  ${d.caps.join("\n  ")}`);
  console.log(`\nSeniority: ${d.seniorityFit} — ${d.seniorityReason}`);
  console.log(`Flags: overqualified=${e.overqualified} keywordStuffing=${e.keywordStuffing}`);
  console.log(`\nSummary: ${e.summary}`);
}

main().finally(() => prisma.$disconnect());
