// Interview questions aimed at one candidate's specific gaps and concerns,
// taken from their stored evaluation. Each carries the reason it was asked,
// so the recruiter knows what it's probing. Rule-based; the recruiter edits
// freely.

import type { Job } from "@prisma/client";
import { shortRequirementLabel } from "@/lib/requirements";
import type { ScoringDetails } from "@/lib/scoring";

export interface InterviewQuestion {
  question: string;
  reason: string;
}

const MAX_QUESTIONS = 6;
const MIN_QUESTIONS = 5;

// First line/sentence of a multi-line field, without trailing punctuation.
function firstLine(text: string): string {
  const line = text.trim().split(/\n|(?<=\.)\s/)[0] ?? "";
  return line.replace(/^[-*•\d.)\s]+/, "").replace(/[.;:]+$/, "").trim();
}

function lowerFirst(s: string): string {
  return /^[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}

export function generateInterviewQuestions(
  details: ScoringDetails,
  job: Job,
  flags: { overqualified: boolean; keywordStuffing: boolean }
): InterviewQuestion[] {
  const questions: InterviewQuestion[] = [];
  const missing = details.mustHaves.filter((r) => !r.demonstrated);
  const partial = details.mustHaves.filter((r) => r.demonstrated && r.credit < 1);
  const strong = details.mustHaves.filter((r) => r.credit >= 1);

  // 1. Missing must-haves — the most direct gaps (at most two).
  const missingPhrasings = [
    (label: string) =>
      `This role needs ${label}, which your CV doesn't show. What's your experience there — what did you do, and what came of it?`,
    (label: string) =>
      `Walk me through the closest thing you've done to ${label}. What was your part, and what would you need to learn to do it here?`,
  ];
  missing.slice(0, 2).forEach((r, i) => {
    questions.push({
      question: missingPhrasings[i](shortRequirementLabel(r.requirement)),
      reason: `Missing must-have: "${r.requirement}"${r.evidenceType === "skills_list_only" ? " (only listed as a skill)" : ""}`,
    });
  });

  // 2. Flags, each probed directly.
  if (flags.keywordStuffing) {
    questions.push({
      question:
        "Pick one technology from your skills list and walk me through a specific project where you used it — your part, what got in the way, and the result.",
      reason: "Flag: skills listed without work showing them used",
    });
  }
  if (flags.overqualified) {
    questions.push({
      question: `This is a ${details.rubric.roleLevel.toLowerCase()} role. What draws you to it at this point in your career, and what would you want from it in two years?`,
      reason: `Flag: overqualified — ${details.seniorityReason}`,
    });
  }

  // 3. Thin evidence and experience shortfall.
  for (const r of partial.slice(0, 2)) {
    questions.push({
      question: `Tell me about the most complex work you've done in ${shortRequirementLabel(r.requirement)} — what made it hard, and what did you decide?`,
      reason: `Limited evidence for "${r.requirement}": ${r.evidence}`,
    });
  }
  const { relevantYears, requiredYears } = details.experience;
  if (requiredYears > 0 && relevantYears < requiredYears) {
    questions.push({
      question: "Which of your past work is closest to what this role does day to day, and what did you own there yourself?",
      reason: `${relevantYears} years of relevant experience vs ${requiredYears} required`,
    });
  }

  // 4. Fill up: validate their strongest claim and the role's first priority.
  const firstPriority = firstLine(job.whatTheyOwnFirst);
  const fillers: InterviewQuestion[] = [];
  if (strong[0]) {
    fillers.push({
      question: `Your CV shows strong experience in ${shortRequirementLabel(strong[0].requirement)}. What's the hardest problem you hit there, and what would you do differently now?`,
      reason: `Validating a claimed strength: "${strong[0].requirement}"`,
    });
  }
  if (firstPriority) {
    fillers.push({
      question: `One of the first things this role owns is to ${lowerFirst(firstPriority)}. How would you approach your first 30 days on that?`,
      reason: "Role fit: what they'd own first",
    });
  }
  for (const r of strong.slice(1, 3)) {
    fillers.push({
      question: `Give me a specific example of your work in ${shortRequirementLabel(r.requirement)} — the situation, what you did, and the outcome.`,
      reason: `Validating a claimed strength: "${r.requirement}"`,
    });
  }
  fillers.push(
    {
      question: "What's a decision you made at work that turned out to be wrong, and what did you change afterwards?",
      reason: "General judgment check",
    },
    {
      question: `What would you most need to learn in your first 90 days as ${job.title}, and how would you go about it?`,
      reason: "Self-awareness about ramp-up",
    }
  );

  for (const f of fillers) {
    const needed = questions.length < MIN_QUESTIONS || (questions.length < MAX_QUESTIONS && fillers.indexOf(f) < 2);
    if (needed) questions.push(f);
  }

  return questions.slice(0, MAX_QUESTIONS);
}
