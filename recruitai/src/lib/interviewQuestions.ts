// Interview questions aimed at one candidate's specific gaps and concerns,
// taken from their evaluation. Each carries the reason it was asked, so the
// recruiter knows what it's probing. Rule-based; the recruiter edits freely.

import type { Job } from "@prisma/client";
import { scoreCandidate } from "@/lib/scoring";
import { matchRequirements, shortRequirementLabel } from "@/lib/requirements";

export interface InterviewQuestion {
  question: string;
  reason: string;
}

const MAX_QUESTIONS = 6;

// First line/sentence of a multi-line field, without trailing punctuation.
function firstLine(text: string): string {
  const line = text.trim().split(/\n|(?<=\.)\s/)[0] ?? "";
  return line.replace(/^[-*•\d.)\s]+/, "").replace(/[.;:]+$/, "").trim();
}

function lowerFirst(s: string): string {
  return /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}
const MIN_QUESTIONS = 5;

export function generateInterviewQuestions(cvText: string, job: Job): InterviewQuestion[] {
  const evaluation = scoreCandidate(cvText, job);
  const dims = new Map(evaluation.dimensionDetails.map((d) => [d.dimension, d]));
  const { matched, missing } = matchRequirements(cvText, job.keySkills);
  const questions: InterviewQuestion[] = [];

  // 1. Missing requirements — the most direct gaps (at most two).
  const missingPhrasings = [
    (label: string) =>
      `This role needs ${label}, which your CV doesn't mention. What's your experience there — what did you do, and what came of it?`,
    (label: string) =>
      `Walk me through the closest thing you've done to ${label}. What was your part, and what would you need to learn to do it here?`,
  ];
  missing.slice(0, 2).forEach((req, i) => {
    questions.push({
      question: missingPhrasings[i](shortRequirementLabel(req)),
      reason: `Missing requirement: "${req}"`,
    });
  });

  // 2. Red flags, each probed directly.
  const redFlags = dims.get("Red flags")?.keywords ?? [];
  if (redFlags.some((f) => /Only large-team experience/.test(f))) {
    questions.push({
      question: "What's the smallest team you've worked in, and what did you own there that nobody else did?",
      reason: "Red flag: only large-team experience mentioned",
    });
  }
  if (redFlags.some((f) => /Skill list reads as generic/.test(f))) {
    questions.push({
      question:
        "Pick one skill from your CV and walk me through a specific project where you used it — your part, what got in the way, and the result.",
      reason: "Red flag: skills listed without concrete examples",
    });
  }

  // 3. Weak dimensions.
  const building = dims.get("0→1 building evidence");
  if (building && building.score < 50) {
    questions.push({
      question:
        "Tell me about something you built or owned end to end, where there was no playbook. What did you do in the first two weeks?",
      reason:
        building.keywords.length === 0
          ? "No evidence of building or owning work from scratch"
          : `Thin ownership evidence (${building.keywords.join(", ")})`,
    });
  }

  const startup = dims.get("Startup/ambiguity tolerance");
  if (startup && startup.score < 50) {
    const signals = startup.headline.match(/big-corp-only signal\(s\) \(([^)]+)\)/)?.[1];
    questions.push({
      question: signals
        ? "Your background looks mostly large-company and process-driven. Tell me about a time you had to make a call with no clear process and no one to escalate to."
        : "Tell me about a time priorities changed suddenly and there was no process to follow. How did you decide what to do?",
      reason: signals
        ? `Large-company / process-heavy signals (${signals.split(", ").slice(0, 3).join(", ")})`
        : "No evidence of small-team or ambiguous environments",
    });
  }

  const track = dims.get("Track record of measurable impact");
  if (track && track.score < 50) {
    questions.push({
      question:
        "Pick one achievement from your CV and put numbers on it — what moved, by how much, and how do you know it was your work?",
      reason:
        track.keywords.length === 0 ? "No quantified results on the CV" : "Few quantified results on the CV",
    });
  }

  // 4. Fill up: validate their strongest claim and the role's first priority,
  //    then (for candidates with few gaps) further claims, until MIN_QUESTIONS.
  const firstPriority = firstLine(job.whatTheyOwnFirst);
  const fillers: InterviewQuestion[] = [];
  if (matched[0]) {
    fillers.push({
      question: `Your CV shows experience in ${shortRequirementLabel(matched[0])}. What's the hardest problem you hit there, and what would you do differently now?`,
      reason: `Validating a claimed strength: "${matched[0]}"`,
    });
  }
  if (firstPriority) {
    fillers.push({
      question: `One of the first things this role owns is to ${lowerFirst(firstPriority)}. How would you approach your first 30 days on that?`,
      reason: "Role fit: what they'd own first",
    });
  }
  for (const req of matched.slice(1, 3)) {
    fillers.push({
      question: `Give me a specific example of your work in ${shortRequirementLabel(req)} — the situation, what you did, and the outcome.`,
      reason: `Validating a claimed strength: "${req}"`,
    });
  }
  if (missing[2]) {
    fillers.push({
      question: missingPhrasings[0](shortRequirementLabel(missing[2])),
      reason: `Missing requirement: "${missing[2]}"`,
    });
  }
  fillers.push(
    {
      question: "What's a decision you made at work that turned out to be wrong, and what did you change afterwards?",
      reason: "General judgment check",
    },
    {
      question: `What would you most need to learn in your first 90 days as ${job.title}, and how would you go about it?`,
      reason: "Self-awareness about ramp-up (few gaps found on the CV)",
    }
  );

  for (const f of fillers) {
    const needed = questions.length < MIN_QUESTIONS || (questions.length < MAX_QUESTIONS && fillers.indexOf(f) < 2);
    if (needed) questions.push(f);
  }

  return questions.slice(0, MAX_QUESTIONS);
}
