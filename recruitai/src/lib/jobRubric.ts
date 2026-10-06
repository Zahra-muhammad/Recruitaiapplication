// Turns a job posting (title, full description, key skills, first
// priorities, seniority) into the rubric candidates are scored against:
// must-haves, nice-to-haves and required years. Built once per version of
// the job text and stored on the Job, so every candidate for a job is
// scored against the exact same list.

import { createHash } from "crypto";
import { z } from "zod";
import type { Job, Seniority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { callStructured, SCORING_MODEL } from "@/lib/ai/claude";

const RUBRIC_VERSION = "2";

const RubricSchema = z.object({
  mustHaves: z.array(z.string()).describe("Required capabilities, one concrete item each."),
  niceToHaves: z.array(z.string()).describe("Preferred / bonus capabilities, one concrete item each."),
  minYearsExperience: z
    .number()
    .nullable()
    .describe("Minimum years of relevant professional experience the posting asks for, or null if it doesn't say."),
  roleLevel: z.string().describe('Short description of the level, e.g. "Senior individual contributor".'),
  isManagementRole: z.boolean().describe("True only if the role is primarily managing people."),
});

export type JobRubric = z.infer<typeof RubricSchema> & {
  // Years used for scoring: the posting's own number, else a default for
  // the job's seniority level.
  requiredYears: number;
  requiredYearsSource: "posting" | "seniority default";
};

type RubricJob = Pick<Job, "title" | "description" | "keySkills" | "whatTheyOwnFirst" | "stageContext" | "seniority">;

const SENIORITY_DEFAULT_YEARS: Record<Seniority, number> = {
  ENTRY: 0,
  MID: 2,
  SENIOR: 5,
  LEAD: 7,
  EXECUTIVE: 10,
};

const SYSTEM = `You turn a job posting into a hiring rubric. Another step will score CVs against it, so every item must be something a CV can show evidence for.

Rules:
- mustHaves: when the posting has a requirements list ("Must have", "Requirements", "What you need"…), use exactly its items, one per bullet, keeping the employer's wording. Do NOT split a bullet into several items — a bullet like "SQL, Excel and building dashboards" stays one requirement. Only if the posting has no requirements list, derive the 3-8 core requirements from the title, description and key skills.
- Responsibilities ("What you'll do", first projects) and company/product context are not requirements — don't turn them into must-haves.
- niceToHaves: items the posting marks as preferred, bonus, "nice to have" or "a plus", one per bullet. Empty if none.
- Do NOT put years of experience in either list — return them in minYearsExperience instead (null if the posting gives no number).
- Never include anything about age, gender, nationality, ethnicity, religion, marital or family status, photos, or other protected characteristics, even if the posting mentions them. Location, relocation or work-authorisation items are also excluded, from both lists.
- Do not invent requirements the posting doesn't support.`;

export function jobRubricHash(job: RubricJob): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        RUBRIC_VERSION,
        SCORING_MODEL,
        job.title,
        job.description,
        job.keySkills,
        job.whatTheyOwnFirst,
        job.stageContext,
        job.seniority,
      ])
    )
    .digest("hex");
}

function finalize(raw: z.infer<typeof RubricSchema>, seniority: Seniority): JobRubric {
  const mustHaves = raw.mustHaves.map((s) => s.trim()).filter(Boolean);
  const niceToHaves = raw.niceToHaves.map((s) => s.trim()).filter(Boolean);
  if (mustHaves.length === 0 && niceToHaves.length === 0) {
    throw new Error("The job rubric came back empty — the posting may be too short to score against.");
  }
  const fromPosting = raw.minYearsExperience != null && raw.minYearsExperience >= 0;
  return {
    ...raw,
    // A posting with only "nice to haves" still needs something to anchor on.
    mustHaves: mustHaves.length > 0 ? mustHaves : niceToHaves,
    niceToHaves: mustHaves.length > 0 ? niceToHaves : [],
    requiredYears: fromPosting ? raw.minYearsExperience! : SENIORITY_DEFAULT_YEARS[seniority],
    requiredYearsSource: fromPosting ? "posting" : "seniority default",
  };
}

export async function buildJobRubric(job: RubricJob): Promise<JobRubric> {
  const user = `<job_posting>
Title: ${job.title}
Seniority level set by the employer: ${job.seniority}
Company stage: ${job.stageContext}

Description:
${job.description}

Key skills field:
${job.keySkills}

What this person will own first:
${job.whatTheyOwnFirst}
</job_posting>`;

  const raw = await callStructured({ label: "rubric", system: SYSTEM, user, schema: RubricSchema, effort: "medium" });
  const rubric = finalize(raw, job.seniority);
  console.info("[rubric] built", JSON.stringify({ mustHaves: rubric.mustHaves.length, niceToHaves: rubric.niceToHaves.length, requiredYears: rubric.requiredYears }));
  return rubric;
}

interface StoredRubric {
  hash: string;
  rubric: JobRubric;
}

function readStored(value: string | null, hash: string): JobRubric | null {
  if (!value) return null;
  try {
    const stored = JSON.parse(value) as StoredRubric;
    return stored.hash === hash ? stored.rubric : null;
  } catch {
    return null;
  }
}

// Returns the job's stored rubric, building it on first use. If two CVs
// for a new job are scored at once, only the first stored rubric wins and
// both use it, so candidates are never scored against different lists.
export async function getJobRubric(job: RubricJob & Pick<Job, "id" | "scoringRubric">): Promise<JobRubric> {
  const hash = jobRubricHash(job);
  const cached = readStored(job.scoringRubric, hash);
  if (cached) return cached;

  const rubric = await buildJobRubric(job);
  const value = JSON.stringify({ hash, rubric } satisfies StoredRubric);
  await prisma.job.updateMany({
    where: { id: job.id, OR: [{ scoringRubric: null }, { NOT: { scoringRubric: { contains: hash } } }] },
    data: { scoringRubric: value },
  });
  const fresh = await prisma.job.findUnique({ where: { id: job.id }, select: { scoringRubric: true } });
  // Remember it on the object too, so later calls with this same job
  // (e.g. scoring several candidates in a loop) don't rebuild it.
  job.scoringRubric = fresh?.scoringRubric ?? value;
  return readStored(job.scoringRubric, hash) ?? rubric;
}
