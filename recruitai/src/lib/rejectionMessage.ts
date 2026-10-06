// Drafts the "not moving forward" note a recruiter sends an applicant. It's
// a starting point the recruiter edits and approves before sending — never
// sent automatically. It names one real strength and the area where other
// candidates were a closer match, both taken from this candidate's own
// evaluation, so it reads like it was written for them. Never a score or
// verdict.

import { shortRequirementLabel } from "@/lib/requirements";
import type { ScoringDetails } from "@/lib/scoring";

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

// Picks the strength and gap for this candidate from their stored
// evaluation: strength = their best-evidenced must-have; gap = a must-have
// they didn't demonstrate (else experience, if they were short of it).
export function pickStrengthAndGap(details: ScoringDetails | null): { strength?: string; gapArea?: string } {
  if (!details) return {};
  const best = [...details.mustHaves].sort((a, b) => b.credit - a.credit)[0];
  const strength = best && best.credit >= 0.5 ? shortRequirementLabel(best.requirement) : undefined;

  const missing = details.mustHaves.find((r) => !r.demonstrated);
  let gapArea = missing ? shortRequirementLabel(missing.requirement) : undefined;
  if (!gapArea && details.experience.relevantYears < details.experience.requiredYears) {
    gapArea = "the depth of hands-on experience this role needs";
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
