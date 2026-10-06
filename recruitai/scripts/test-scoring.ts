// End-to-end scoring test: reads the 8 test CVs (real PDF and Word files)
// through the app's own file reader, builds the job rubric, scores every
// CV with the live AI pipeline and checks the verdicts against
// scoring-fixtures/expected.json. The scorer never sees expected.json.
//
//   npm run test:scoring              full run (needs ANTHROPIC_API_KEY; ~16 AI calls + 1 for the rubric)
//   npm run test:scoring -- --offline file reading + score arithmetic only, no API calls
//
// Exits with code 1 if any CV can't be read or any verdict doesn't match.

import { readFileSync, readdirSync } from "fs";
import type { Job } from "@prisma/client";
import { extractCvText, type CvFormat } from "../src/lib/cvIntake";
import { buildJobRubric, type JobRubric } from "../src/lib/jobRubric";
import { computeScore, scoreCv, type Assessment, type ScoringResult } from "../src/lib/scoring";
import { roleSpans, weightedYears, type CvProfile } from "../src/lib/cvProfile";

const DIR = "scripts/scoring-fixtures";
const offline = process.argv.includes("--offline");

interface Expected {
  name: string;
  expect: string[];
  why?: string;
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

// Checks the deterministic parts without the API: date maths and the
// rubric arithmetic, on a hand-built profile and assessment.
function offlineChecks() {
  const today = new Date(2026, 9, 6); // Oct 2026
  const role = (startDate: string | null, endDate: string | null, isCareerBreak = false) => ({
    title: "x", organisation: null, startDate, endDate, isCareerBreak, summary: "", skillsUsed: [],
  });
  const { spans, undated } = roleSpans(
    [role("2024-01", "present"), role("2023-03", "2023-12", true), role("2019-07", "2023-02"), role("2020-01", "2020-06"), role(null, null)],
    today
  );
  assert(undated.length === 1, "role without dates is reported as undated");
  // Jan 2024–Oct 2026 = 34 months; Jul 2019–Feb 2023 = 44 months (overlap counted once); break ignored.
  assert(weightedYears(spans) === 6.5, `total years ${weightedYears(spans)} should be 6.5`);
  assert(weightedYears(spans, (i) => (i === 0 ? 1 : 0.5)) === 4.7, "adjacent roles count half");

  const rubric: JobRubric = {
    mustHaves: ["A", "B", "C", "D"], niceToHaves: ["E", "F"], minYearsExperience: 5, roleLevel: "Senior IC",
    isManagementRole: false, requiredYears: 5, requiredYearsSource: "posting",
  };
  const profile = { fullName: "Test", email: null, phone: null, location: null, headline: null, roles: [role("2019-01", "present")], projects: [], skillsListed: [], education: [], certifications: [], languages: [], achievements: [] } satisfies CvProfile;
  const j = (index: number, level: "met" | "partial" | "missing", evidenceType: Assessment["mustHaves"][number]["evidenceType"]) => ({ index, level, evidenceType, evidence: "" });
  const base: Assessment = {
    mustHaves: [0, 1, 2, 3].map((i) => j(i, "met", "work_experience")),
    niceToHaves: [j(0, "met", "work_experience"), j(1, "missing", "none")],
    roleRelevance: [{ index: 0, relevance: "direct" }],
    seniorityFit: "matches", seniorityReason: "", impactEvidence: "strong", educationFit: "some",
    keywordStuffing: false, keywordStuffingReason: "", strengths: [], concerns: [], summary: "",
  };
  const strong = computeScore(profile, rubric, base, today);
  assert(strong.totalScore === 91 && strong.verdict === "COMPATIBLE", `strong candidate scored ${strong.totalScore}`);

  const listed = computeScore(profile, rubric, { ...base, mustHaves: [0, 1, 2, 3].map((i) => j(i, "met", "skills_list_only")) }, today);
  assert(listed.verdict === "NOT_COMPATIBLE" && listed.keywordStuffing, "skills only in a list → not compatible + flagged");

  const oneMissing = computeScore(profile, rubric, { ...base, mustHaves: [...base.mustHaves.slice(0, 3), j(3, "missing", "none")] }, today);
  assert(oneMissing.totalScore <= 74, "a missing must-have caps the score below Compatible");

  const over = computeScore(profile, rubric, { ...base, seniorityFit: "above" }, today);
  assert(over.overqualified && over.totalScore <= 74, "overqualified is flagged and not ranked as Compatible");
  console.log("Offline checks passed: date maths, evidence weighting, must-have caps, overqualification.\n");
}

function passes(result: ScoringResult, expected: Expected): boolean {
  if (expected.expect.includes(result.verdict)) return true;
  return expected.expect.includes("FLAGGED") && (result.overqualified || result.keywordStuffing);
}

async function main() {
  offlineChecks();

  const jobJson = JSON.parse(readFileSync(`${DIR}/job.json`, "utf8"));
  const job = jobJson as Pick<Job, "title" | "description" | "keySkills" | "whatTheyOwnFirst" | "stageContext" | "seniority">;
  const expected: Record<string, Expected> = JSON.parse(readFileSync(`${DIR}/expected.json`, "utf8"));

  // 1. File reading (PDF + Word) through the app's own extractor.
  const cvs: { stem: string; text: string }[] = [];
  for (const file of readdirSync(`${DIR}/cvs`).sort()) {
    const format = file.split(".").pop() as CvFormat;
    const text = await extractCvText(readFileSync(`${DIR}/cvs/${file}`), format);
    const stem = file.replace(/\.\w+$/, "");
    assert(text.includes(expected[stem].name.split(" ")[0]) || text.toUpperCase().includes(expected[stem].name.split(" ")[0].toUpperCase()), `${file}: candidate name present in extracted text`);
    cvs.push({ stem, text });
  }
  console.log(`Read ${cvs.length} CVs (PDF + Word) — all have text.\n`);
  if (offline) return;

  // 2. Rubric from the full job posting.
  const rubric = await buildJobRubric(job);
  console.log("Rubric built from the full job description:");
  console.log(`  Must-haves:    ${rubric.mustHaves.join(" | ")}`);
  console.log(`  Nice-to-haves: ${rubric.niceToHaves.join(" | ")}`);
  console.log(`  Required years: ${rubric.requiredYears} (${rubric.requiredYearsSource}); level: ${rubric.roleLevel}\n`);

  // 3. Score every CV (3 at a time).
  const results = new Map<string, ScoringResult | Error>();
  const queue = [...cvs];
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      for (let cv = queue.shift(); cv; cv = queue.shift()) {
        try {
          results.set(cv.stem, await scoreCv(cv.text, rubric));
        } catch (err) {
          results.set(cv.stem, err as Error);
        }
      }
    })
  );

  // 4. Report.
  let failures = 0;
  const rows = cvs
    .map(({ stem }) => ({ stem, r: results.get(stem)! }))
    .sort((a, b) => (b.r instanceof Error ? -1 : b.r.totalScore) - (a.r instanceof Error ? -1 : a.r.totalScore));
  console.log("Name (read from CV)    Score  Verdict         Flags                 Expected                  Result");
  for (const { stem, r } of rows) {
    const exp = expected[stem];
    if (r instanceof Error) {
      failures++;
      console.log(`${exp.name.padEnd(22)} ERROR  ${r.message}`);
      continue;
    }
    const ok = passes(r, exp);
    if (!ok) failures++;
    const flags = [r.overqualified && "overqualified", r.keywordStuffing && "keyword-stuffing"].filter(Boolean).join(",") || "-";
    console.log(
      `${(r.contact.fullName ?? "(none)").padEnd(22)} ${String(r.totalScore).padStart(5)}  ${r.verdict.padEnd(15)} ${flags.padEnd(21)} ${exp.expect.join(" or ").padEnd(25)} ${ok ? "PASS" : "FAIL"}`
    );
  }

  console.log("\nWhy each score:");
  for (const { stem, r } of rows) {
    if (r instanceof Error) continue;
    const d = r.details;
    console.log(`\n${expected[stem].name} — ${r.totalScore} (${r.verdict}); parts: must-haves ${r.parts.mustHaves}, experience ${r.parts.experience}, nice-to-haves ${r.parts.niceToHaves}, other ${r.parts.other}`);
    console.log(`  Years: ${d.experience.relevantYears} relevant / ${d.experience.totalYears} total (needs ${d.experience.requiredYears}); seniority: ${d.seniorityFit}`);
    console.log(`  Matched: ${d.mustHaves.filter((m) => m.demonstrated).map((m) => `${m.requirement} [${m.level}, ${m.evidenceType}]`).join("; ") || "none"}`);
    console.log(`  Missing: ${d.mustHaves.filter((m) => !m.demonstrated).map((m) => `${m.requirement} [${m.evidenceType}]`).join("; ") || "none"}`);
    if (d.caps.length) console.log(`  Capped:  ${d.caps.join(" ")}`);
    console.log(`  Summary: ${r.summary}`);
  }

  console.log(`\n${cvs.length - failures}/${cvs.length} passed.`);
  if (failures) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
