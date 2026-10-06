// Drafts the "not moving forward" note a recruiter sends an applicant. It's
// a starting point the recruiter edits and approves before sending — never
// sent automatically. It names one real strength and the area where other
// candidates were a closer match, both taken from this candidate's own
// evaluation, so it reads like it was written for them. Never a score or
// verdict.

import type { Job } from "@prisma/client";
import { matchRequirements, shortRequirementLabel } from "@/lib/requirements";
import { scoreCandidate } from "@/lib/scoring";

export interface RejectionDraftInput {
  applicantName: string;
  jobTitle: string;
  companyName: string;
  recruiterName: string;
  // True if they had reached the interview stage (or beyond) — they've
  // invested more time, so the note acknowledges that specifically.
  reachedInterview: boolean;
  // One specific strength, phrased to follow "Your experience in …".
  strength?: string;
  // The area where other candidates were a closer match.
  gapArea?: string;
}

// Applicant-friendly wording for the weaker scoring dimensions — used as the
// gap area when every listed requirement was met.
const DIMENSION_GAP_PHRASES: Record<string, string> = {
  "0→1 building evidence": "building and owning work from the ground up",
  "Startup/ambiguity tolerance": "early-stage, small-team environments",
  "Track record of measurable impact": "measurable, quantified results in similar work",
};

// Uses the candidate's own capitalisation for short skills ("react" as typed
// on the job → "React" as written on their CV).
function asWrittenInCv(label: string, cvText: string): string {
  if (label.includes(" ") || label.length > 30) return label;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cvText.match(new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, "i"))?.[0] ?? label;
}

// Picks the strength and gap for this candidate from their evaluation:
// strength = a job requirement their CV matches (else their strongest
// evidence); gap = a requirement it doesn't (else their weakest dimension).
export function pickStrengthAndGap(cvText: string, job: Job): { strength?: string; gapArea?: string } {
  const { matched, missing } = matchRequirements(cvText, job.keySkills);
  const evaluation = scoreCandidate(cvText, job);

  let strength = matched[0] ? asWrittenInCv(shortRequirementLabel(matched[0]), cvText) : undefined;
  if (!strength) {
    const best = [...evaluation.dimensionDetails]
      .filter((d) => d.dimension !== "Red flags" && d.keywords.length > 0)
      .sort((a, b) => b.score - a.score)[0];
    if (best?.dimension === "Track record of measurable impact") strength = "delivering measurable results";
    else if (best?.dimension === "0→1 building evidence") strength = "building things from scratch";
    else if (best?.dimension === "Startup/ambiguity tolerance") strength = "working in fast-moving, small teams";
  }

  let gapArea = missing[0] ? shortRequirementLabel(missing[0]) : undefined;
  if (!gapArea) {
    const weakest = [...evaluation.dimensionDetails]
      .filter((d) => DIMENSION_GAP_PHRASES[d.dimension])
      .sort((a, b) => a.score - b.score)[0];
    if (weakest && weakest.score < 70) gapArea = DIMENSION_GAP_PHRASES[weakest.dimension];
  }

  return { strength, gapArea };
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function draftRejectionMessage(input: RejectionDraftInput): string {
  const { jobTitle, companyName } = input;
  const paragraphs: string[] = [`Hi ${firstName(input.applicantName)},`];

  const thanks = input.reachedInterview
    ? `Thank you for applying to the ${jobTitle} role at ${companyName}, and for the time you put into interviewing with us — I know that's a real commitment.`
    : `Thank you for applying to the ${jobTitle} role at ${companyName}.`;

  const closerMatch = input.gapArea
    ? `other candidates whose background more closely matches ${input.gapArea} for this particular role`
    : "other candidates whose background more closely matches what this particular role needs right now";

  const decision = input.strength
    ? `Your experience in ${input.strength} stood out, but we've decided to move forward with ${closerMatch}.`
    : `We've decided to move forward with ${closerMatch}.`;

  paragraphs.push(`${thanks} ${decision}`);
  paragraphs.push(
    `This came down to fit for this specific role rather than your overall ability. If a role opens up at ${companyName} that's a closer match, I'd genuinely be glad to see your name again.`
  );
  paragraphs.push(`Best,\n${input.recruiterName}\n${companyName}`);

  return paragraphs.join("\n\n");
}
