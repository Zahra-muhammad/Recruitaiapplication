// TODO: This rule-based scorer mirrors the recruit-compare.md rubric, adapted
// for any job function (not just engineering): Skills Match 30%, 0→1 Building
// / Ownership 25%, Startup Tolerance 20%, Track Record 10%, Red Flags 15%.
// Replace with a Claude API call using that same rubric as the prompt once
// ready — keep the function signature identical.

import type { Job } from "@prisma/client";
import { matchRequirements } from "@/lib/requirements";

export type Verdict = "COMPATIBLE" | "BORDERLINE" | "NOT_COMPATIBLE";

export interface DimensionInsight {
  dimension: string;
  score: number;
  weightPct: number;
  headline: string;
  whyItMatters: string;
  keywords: string[];
}

export interface Evaluation {
  totalScore: number;
  verdict: Verdict;
  skillsMatchScore: number;
  buildingScore: number;
  startupToleranceScore: number;
  trackRecordScore: number;
  redFlagScore: number;
  summary: string;
  strengths: DimensionInsight[];
  concerns: DimensionInsight[];
  potential: string[];
  generic: GenericApplicationSignal;
  // All five dimensions, unsorted and untruncated — for debugging/explaining.
  dimensionDetails: DimensionInsight[];
}

interface DimensionResult {
  score: number;
  matched: string[];
  headline: string;
}

// Each dimension is scored 0-100, then weighted. Weights must sum to 1.
export const SCORING_WEIGHTS = {
  skillsMatch: 0.3,
  building: 0.25,
  startupTolerance: 0.2,
  trackRecord: 0.1,
  redFlags: 0.15,
};
const WEIGHTS = SCORING_WEIGHTS;

// ---------------------------------------------------------------------------
// Keyword banks — deliberately function-agnostic (no engineering-specific
// terms), so the same rubric works for sales, marketing, ops, support, etc.
// ---------------------------------------------------------------------------

const BUILDING_PHRASES = [
  "built", "shipped", "launched", "solo", "founder", "co-founder",
  "side project", "from scratch", "mvp", "0 to 1", "0->1", "0→1",
  "zero to one", "bootstrapped", "self-taught", "personal project",
  "started", "established", "spearheaded", "pioneered", "created",
  "kickstarted", "initiated", "stood up", "set up from nothing",
  "first hire", "first employee", "grew from", "scaled from",
];

const STARTUP_POSITIVE_PHRASES = [
  "startup", "seed-stage", "seed stage", "early-stage", "early stage",
  "small team", "wore many hats", "many hats", "no process", "freelance",
  "self-funded", "fast-paced", "fast paced", "ambiguity", "ambiguous",
  "scrappy", "generalist", "pre-seed", "series a", "0 to 1 team",
  "lean team", "lean-team", "tiny team",
];

const STARTUP_NEGATIVE_PHRASES = [
  "fortune 500", "fortune500", "ticket-based", "ticket based",
  "assigned by pm", "assigned tickets", "waterfall", "strict hierarchy",
  "large corporation", "large enterprise", "multinational corporation",
  "google", "amazon", "microsoft", "meta platforms", "facebook, inc",
  "apple inc", "ibm", "oracle", "accenture", "deloitte", "capgemini",
  "tcs", "infosys", "wipro", "cognizant", "big four",
];

// Big-company names count as an employer signal only as whole words and not
// when naming one of their products — "Google Ads", "Amazon Web Services",
// "Microsoft Excel" and "Oracle DB" are tools nearly everyone uses, not
// evidence of big-corp-only experience.
const PRODUCT_SUFFIX =
  /^\s*(ads|adwords|analytics|tag manager|search console|sheets|docs|slides|workspace|cloud|gcp|play|maps|data studio|looker|firebase|bigquery|meet|drive|web services|aws|s3|ec2|seller central|advertising|redshift|excel|office|word|powerpoint|teams|azure|365|dynamics|power bi|sql|db|database|netsuite|watson)\b/;

// A big-company name listed alongside other ad/social platforms ("across Meta,
// Google, and TikTok") names channels someone used, not an employer.
const PLATFORM_NAMES =
  /\b(meta|facebook|instagram|tiktok|linkedin|snapchat|pinterest|bing|reddit|youtube|twitter|x ads|google|amazon|microsoft|apple search ads)\b/g;

function inPlatformList(text: string, index: number, length: number): boolean {
  const start = Math.max(0, text.lastIndexOf("\n", index) + 1, index - 60);
  const newline = text.indexOf("\n", index + length);
  const end = Math.min(newline === -1 ? text.length : newline, index + length + 60);
  const others = (text.slice(start, end).match(PLATFORM_NAMES) ?? []).length - 1;
  return others >= 1;
}

function findEmployerSignals(text: string): string[] {
  return STARTUP_NEGATIVE_PHRASES.filter((phrase) => {
    const re = new RegExp(`(?<![a-z0-9])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "g");
    for (const m of text.matchAll(re)) {
      const after = text.slice(m.index + m[0].length);
      if (PRODUCT_SUFFIX.test(after)) continue;
      if (inPlatformList(text, m.index, m[0].length)) continue;
      return true;
    }
    return false;
  });
}

// Mirror of LARGE_TEAM_PATTERNS: "4-person startup", "team of 6", "12 people".
const SMALL_TEAM_PATTERN =
  /\b([2-9]|1[0-5])[- ]?(person|people|member)\b|\bteam of ([2-9])\b/i;

const LARGE_TEAM_PATTERNS = [
  /team of (1[0-9]|[2-9][0-9]|[0-9]{3,})/i,
  /\b(10|15|20|25|30|40|50|60|70|80|90|100)\+?\s*(person|people|member)?\s*team\b/i,
  /large team/i,
  /large (engineering|sales|marketing|operations) org/i,
];

const ACHIEVEMENT_SIGNAL_PATTERNS = [
  /\d+%/, // percentages
  /\$[\d,]+/, // dollar figures
  /\b\d+[km]\+?\s*(users|customers|clients|leads|deals|accounts|subscribers|followers|requests|downloads|rows)/i,
  /\bled\b/i,
  // Word forms: "increased"/"increasing", "reduced"/"reducing", etc.
  /\b(increas|boost|doubl|tripl)(ed|ing|es|e)\b/i,
  /\b(reduc(ed|ing|es|e|tion)|lower(ed|ing)|cut(ting)?)\b/i,
  /\bimprov(ed|ing|es|e|ement)\b/i,
  /\b(grew|grow(n|ing|th of))\b/i,
  /\bclosed\b/i,
  /\bnegotiated\b/i,
  // Before → after results: "from 22% to 34%", "from 3 to 12 days".
  /\bfrom \$?\d[\d,.]*[%kmx]? to \$?\d[\d,.]*[%kmx]?/i,
  // Multipliers: "3x", "10x faster".
  /\b\d+(\.\d+)?x\b/i,
  /\bquota\b/i,
  /\bpipeline\b/i,
  /\bconversion\b/i,
  /\brevenue\b/i,
  /\bretention\b/i,
];

// Why each dimension matters for an early-stage founding hire — shown
// alongside every strength/concern so a recruiter understands the stakes.
const WHY_IT_MATTERS: Record<string, string> = {
  "Skills match with job":
    "Direct experience with what this role needs shortens ramp-up time — but it's the most replaceable signal of the five, since a strong operator can pick up new tools and domains quickly.",
  "0→1 building evidence":
    "This is the single best predictor of 0→1 execution: someone who has built or launched something from nothing before is far less likely to stall when there's no playbook, no team, and no safety net.",
  "Startup/ambiguity tolerance":
    "Early-stage work means shifting priorities, no process, and decisions made with incomplete information. Candidates used to structure and hand-offs often struggle here regardless of raw skill.",
  "Track record of measurable impact":
    "Concrete, quantified outcomes (revenue, growth, cost, conversion) are harder to fake than a skill list, and signal someone who thinks in terms of results, not just tasks.",
  "Red flags":
    "A high score here means fewer unresolved unknowns going into an offer; a low score doesn't necessarily disqualify someone, but each flag is a specific thing worth asking about directly.",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findMatches(text: string, keywords: string[]): string[] {
  return keywords.filter((kw) => text.includes(kw.toLowerCase()));
}

function countOccurrences(text: string, keyword: string): number {
  return text.split(keyword.toLowerCase()).length - 1;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

// ---------------------------------------------------------------------------
// Dimension scorers
// ---------------------------------------------------------------------------

function scoreSkillsMatch(text: string, job: Job): DimensionResult {
  const { matched, missing } = matchRequirements(text, job.keySkills);
  const total = matched.length + missing.length;
  if (total === 0) {
    return { score: 0, matched: [], headline: "No key skills listed on the job — cannot compute overlap." };
  }

  const score = clamp(Math.round((matched.length / total) * 100));

  const headline =
    missing.length === 0
      ? `Has hands-on experience with everything this role calls for (${matched.join("; ")}).`
      : `Matches ${matched.length}/${total} listed requirements. Missing: ${missing.join("; ")}.`;

  return { score, matched, headline };
}

// Ownership half of the "building / ownership" dimension: owning an outcome,
// budget, or function end to end. Each pattern groups word forms so "owned",
// "owning" and "ownership" count as one signal, not three.
const OWNERSHIP_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "owned", re: /\bown(ed|s|ing|ership)\b/ },
  { label: "end-to-end", re: /\bend[- ]to[- ]end\b/ },
  { label: "single-handedly", re: /\bsingle[- ]handedly\b/ },
  { label: "sole owner", re: /\bsole (owner|engineer|marketer|designer|developer|person|hire)\b/ },
  { label: "drove", re: /\b(drove|driving)\b/ },
];

function scoreBuilding(text: string): DimensionResult {
  const phraseHits = findMatches(text, BUILDING_PHRASES);
  const ownershipHits = OWNERSHIP_PATTERNS.filter((p) => p.re.test(text));
  const hits = [...phraseHits, ...ownershipHits.map((p) => p.label)];
  const totalOccurrences =
    phraseHits.reduce((sum, kw) => sum + countOccurrences(text, kw), 0) +
    ownershipHits.reduce((sum, p) => sum + (text.match(new RegExp(p.re.source, "g"))?.length ?? 0), 0);

  const score = clamp(Math.round(hits.length * 12 + Math.min(20, totalOccurrences * 2)));

  const headline =
    hits.length === 0
      ? "No language suggesting independent building or ownership (e.g. \"built\", \"launched\", \"founded\", \"from scratch\") was found."
      : `${hits.length} distinct 0→1/ownership phrase(s) found, ${totalOccurrences} total mention(s).`;

  return { score, matched: hits, headline };
}

function scoreStartupTolerance(text: string): DimensionResult {
  const positive = findMatches(text, STARTUP_POSITIVE_PHRASES);
  if (SMALL_TEAM_PATTERN.test(text) && !positive.includes("small team")) positive.push("small team");
  const negative = findEmployerSignals(text);

  const score = clamp(Math.round(50 + Math.min(60, positive.length * 12) - Math.min(60, negative.length * 15)));

  let headline: string;
  if (positive.length === 0 && negative.length === 0) {
    headline = "No explicit startup or big-corp signals either way — inconclusive from the resume alone.";
  } else if (negative.length > 0) {
    headline = `${positive.length} startup-tolerance signal(s) vs. ${negative.length} big-corp-only signal(s) (${negative.join(", ")}).`;
  } else {
    headline = `${positive.length} startup-tolerance signal(s), no big-corp-only flags.`;
  }

  return { score, matched: positive, headline };
}

// Points per distinct type of quantified/results language — full marks at
// ~9-10 types. Fixed (not derived from the pattern count) so adding a pattern
// doesn't silently rescale everyone's score. Same calibration as the
// original 15-pattern × 1.6 formula.
const TRACK_RECORD_POINTS_PER_TYPE = 160 / 15;

function scoreTrackRecord(text: string): DimensionResult {
  const matchedPatterns = ACHIEVEMENT_SIGNAL_PATTERNS.filter((re) => re.test(text));
  const matchedText = matchedPatterns.map((re) => text.match(re)?.[0] ?? "");
  const score = clamp(Math.round(matchedPatterns.length * TRACK_RECORD_POINTS_PER_TYPE));

  const headline =
    matchedPatterns.length === 0
      ? "No quantified outcomes found (no percentages, dollar figures, or results language like \"increased\"/\"reduced\"/\"grew\")."
      : `${matchedPatterns.length} type(s) of quantified/results language found in the resume.`;

  return { score, matched: matchedText, headline };
}

function scoreRedFlags(text: string, buildingHits: string[], skillsMatched: string[]): DimensionResult {
  let score = 100;
  const flags: string[] = [];

  if (buildingHits.length === 0) {
    score -= 25;
    flags.push("No self-directed projects or initiatives mentioned anywhere in the resume.");
  }

  const largeTeamOnly =
    LARGE_TEAM_PATTERNS.some((re) => re.test(text)) &&
    !findMatches(text, STARTUP_POSITIVE_PHRASES).includes("small team") &&
    !SMALL_TEAM_PATTERN.test(text);
  if (largeTeamOnly) {
    score -= 20;
    flags.push("Only large-team experience mentioned — no evidence of working without organizational scaffolding.");
  }

  if (skillsMatched.length === 0) {
    score -= 20;
    flags.push("No overlap at all with the skills this job specifically lists — background may be a poor fit regardless of overall strength.");
  }

  const achievementSignals = ACHIEVEMENT_SIGNAL_PATTERNS.filter((re) => re.test(text)).length;
  if (achievementSignals === 0) {
    score -= 15;
    flags.push("Skill list reads as generic, with no quantified or concrete examples of impact.");
  }

  score = clamp(score);
  const headline = flags.length > 0 ? flags.join(" ") : "No red flags detected in the resume.";

  return { score, matched: flags, headline };
}

// ---------------------------------------------------------------------------
// Narrative generation
// ---------------------------------------------------------------------------

function buildSummary(
  totalScore: number,
  verdict: Verdict,
  dims: { name: string; score: number }[]
): string {
  const sorted = [...dims].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  const verdictLead: Record<Verdict, string> = {
    COMPATIBLE: "This candidate looks like a strong match for this founding hire.",
    BORDERLINE: "This candidate is a plausible but not obvious fit — worth a closer look, not an easy yes.",
    NOT_COMPATIBLE: "This candidate does not show strong evidence of fit for this role as written.",
  };

  return (
    `${verdictLead[verdict]} Overall score: ${totalScore}/100. ` +
    `Strongest signal: ${top.name} (${top.score}/100). ` +
    `Biggest gap: ${bottom.name} (${bottom.score}/100).`
  );
}

function buildPotential(
  scores: {
    skillsMatch: number;
    building: number;
    startupTolerance: number;
    trackRecord: number;
    redFlags: number;
  },
  totalScore: number
): string[] {
  const potential: string[] = [];

  if (scores.building >= 60) {
    potential.push(
      "Has shown they can build or launch independently — this is the hardest signal to fake and the strongest predictor of handling founding-hire ownership, even where other dimensions are thinner."
    );
  }

  if (scores.building >= 60 && scores.skillsMatch < 50) {
    potential.push(
      "Strong ownership track record without a direct match on this specific skill set — likely to ramp quickly given the breadth already shown."
    );
  }

  if (scores.startupTolerance < 50 && (scores.building >= 60 || scores.skillsMatch >= 60)) {
    potential.push(
      "Capable on paper, but the resume leans corporate/structured. Main risk is adjusting to startup ambiguity rather than raw ability — worth probing directly in an interview rather than screening out."
    );
  }

  if (scores.redFlags < 70 && scores.redFlags >= 40) {
    potential.push(
      "Red flags here mostly reflect gaps in what the resume states (missing metrics, no named initiatives) rather than confirmed weaknesses — a short screening call could resolve several of these."
    );
  }

  if (totalScore >= 85) {
    potential.push(
      "Consistently strong across nearly every dimension — low resume-stage risk; prioritize moving quickly before they take another offer."
    );
  }

  if (potential.length === 0) {
    potential.push(
      "No standout potential signals identified from the resume alone. A structured interview would be needed to assess further before ruling this candidate out."
    );
  }

  return potential;
}

// ---------------------------------------------------------------------------
// Likely-generic application signal. Deliberately separate from the score:
// it never changes totalScore or the verdict and is never used to reject —
// it's a hint for the recruiter to read the CV more closely. Reasons are
// phrased as observations, not accusations.
// ---------------------------------------------------------------------------

export interface GenericApplicationSignal {
  flagged: boolean;
  reasons: string[];
}

const STOCK_PHRASES = [
  "team player", "hard-working", "hardworking", "detail-oriented", "detail oriented",
  "results-driven", "results driven", "self-motivated", "self motivated", "fast learner",
  "quick learner", "go-getter", "excellent communication", "strong communication",
  "passionate about", "proven track record", "think outside the box", "synergy",
  "dynamic individual", "highly motivated", "works well under pressure", "go-to person",
  "dedicated professional", "problem solver", "problem-solver", "motivated professional",
];

const ORG_MARKERS =
  /\b(inc|ltd|llc|gmbh|plc|corp|corporation|university|college|institute|school|agency|studio|labs|bank|hospital|foundation)\b/i;

// Echoed phrases need to be long to count, so ordinary shared vocabulary
// ("experience with React") never trips it.
const ECHO_SHINGLE = 6;
const ECHO_MIN_WORDS = 15;

function wordsOf(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9+#]+/g) ?? [];
}

// Number of job-posting words the CV repeats verbatim in runs of at least
// ECHO_SHINGLE words (overlapping matches merged, so one copied sentence
// isn't counted several times).
function countEchoedWords(cvText: string, jobText: string): number {
  const cvWords = wordsOf(cvText);
  const cvShingles = new Set<string>();
  for (let i = 0; i + ECHO_SHINGLE <= cvWords.length; i++) {
    cvShingles.add(cvWords.slice(i, i + ECHO_SHINGLE).join(" "));
  }

  const jobWords = wordsOf(jobText);
  const covered = new Array<boolean>(jobWords.length).fill(false);
  for (let i = 0; i + ECHO_SHINGLE <= jobWords.length; i++) {
    if (cvShingles.has(jobWords.slice(i, i + ECHO_SHINGLE).join(" "))) {
      for (let j = i; j < i + ECHO_SHINGLE; j++) covered[j] = true;
    }
  }
  return covered.filter(Boolean).length;
}

// Concrete, hard-to-fake detail: dates, named organisations, numbers, and
// proper nouns that don't come from the job posting itself.
function countSpecificitySignals(cvText: string, jobText: string): number {
  const jobWordSet = new Set(wordsOf(jobText));
  const properNouns = new Set(
    (cvText.match(/(?<![.!?]\s|^)\b[A-Z][a-z]{2,}\b/gm) ?? [])
      .map((w) => w.toLowerCase())
      .filter((w) => !jobWordSet.has(w))
  );

  return [
    /\b(19|20)\d{2}\b/.test(cvText),
    ORG_MARKERS.test(cvText),
    QUANTIFIED_DETAIL.test(cvText),
    properNouns.size >= 5,
  ].filter(Boolean).length;
}

// Any concrete figure: "40%", "40 percent", "3x", "$2M", "500 users",
// "18 months", "4-person team".
const QUANTIFIED_DETAIL =
  /\d+(\.\d+)?\s*(%|percent\b|x\b)|[$£€]\s?\d|\b\d+[km]?\+?[\s-]*(users|customers|clients|people|person|members|employees|months|years|deals|accounts|downloads|projects|countries|stores|students)\b/i;

// Stock cover-letter phrases. Two or more, with nothing specific to this role
// or company, suggests a template sent unchanged to many openings.
const TEMPLATE_COVER_PHRASES = [
  "i am writing to express my interest", "i am writing to apply", "i am excited to apply",
  "i believe i would be a great fit", "i believe i am a perfect fit", "i would be a valuable asset",
  "please find attached my", "please find my cv attached", "i look forward to hearing from you",
  "to whom it may concern", "dear hiring manager", "dear sir/madam", "dear sir or madam",
  "thank you for considering my application", "your esteemed organization", "your esteemed company",
  "i am confident that my skills", "i am a highly motivated", "i am a hardworking",
  "the position at your company", "the advertised position", "the above-mentioned position",
];

function coverNoteLooksTemplated(coverNote: string, job: Job & { company?: { name: string } }): boolean {
  const lower = coverNote.toLowerCase();
  const stock = TEMPLATE_COVER_PHRASES.filter((p) => lower.includes(p));
  if (stock.length < 2) return false;

  // Any role-specific reference means someone tailored it.
  const titleWords = job.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const mentionsTitle = titleWords.length > 0 && titleWords.every((w) => lower.includes(w));
  const mentionsCompany = !!job.company?.name && lower.includes(job.company.name.toLowerCase());
  const mentionsRequirement = matchRequirements(coverNote, job.keySkills).matched.length > 0;
  return !mentionsTitle && !mentionsCompany && !mentionsRequirement;
}

export function detectGenericApplication(
  cvText: string,
  job: Job & { company?: { name: string } },
  coverNote?: string | null
): GenericApplicationSignal {
  const jobText = `${job.description}\n${job.whatTheyOwnFirst}`;
  const lower = cvText.toLowerCase();
  const reasons: string[] = [];

  const echoedWords = countEchoedWords(cvText, jobText);
  if (echoedWords >= ECHO_MIN_WORDS) {
    reasons.push(
      `Repeats about ${echoedWords} words of the job posting's own wording verbatim.`
    );
  }

  const specificity = countSpecificitySignals(cvText, jobText);
  const lowSpecificity = specificity <= 1;
  const stockPhrases = findMatches(lower, STOCK_PHRASES);
  const { matched, missing } = matchRequirements(cvText, job.keySkills);
  const jobSkills = [...matched, ...missing];
  const skillCoverage = jobSkills.length > 0 ? matched.length / jobSkills.length : 0;

  if (lowSpecificity && stockPhrases.length >= 3) {
    reasons.push(
      `Leans on stock phrases (${stockPhrases.slice(0, 3).map((p) => `"${p}"`).join(", ")}) with few concrete details like dates, company names, or numbers.`
    );
  }
  if (lowSpecificity && jobSkills.length >= 3 && skillCoverage >= 0.8) {
    reasons.push(
      "Lists nearly every skill in the posting, but without named projects, employers, or dates to show where they were used."
    );
  }

  if (coverNote && coverNoteLooksTemplated(coverNote, job)) {
    reasons.push(
      "Cover note is built from stock phrases (e.g. \"I am writing to express my interest\") and doesn't mention this role, company, or any of its requirements."
    );
  }

  return { flagged: reasons.length > 0, reasons };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Applicant-facing skill match — deliberately separate from scoreCandidate:
// returns only matched/missing skill labels (original casing, as posted),
// never a score or verdict, since applicants should never see those.
// ---------------------------------------------------------------------------

export interface SkillMatchResult {
  matched: string[];
  missing: string[];
}

export function matchSkillsForApplicant(cvText: string, job: Job): SkillMatchResult {
  return matchRequirements(cvText, job.keySkills);
}

// The applicant-facing "am I qualified enough to apply" gate. Deliberately
// built from skill matching only (never the internal weighted score/verdict
// scoreCandidate produces) — a candidate is "qualified" once they match at
// least half of the role's listed key skills. Below that, they get their
// missing skills plus generic CV tips instead of an Apply button.
const QUALIFY_THRESHOLD = 0.5;

export interface QualificationResult extends SkillMatchResult {
  qualified: boolean;
  tips: string[];
}

export function evaluateApplicantQualification(cvText: string, job: Job): QualificationResult {
  const { matched, missing } = matchSkillsForApplicant(cvText, job);
  const total = matched.length + missing.length;
  const qualified = total === 0 || matched.length / total >= QUALIFY_THRESHOLD;

  const tips: string[] = [];
  if (!qualified) {
    if (missing.length > 0) {
      tips.push(
        `Add these to your CV if you have relevant experience with them: ${missing.join(", ")}.`
      );
    }
    tips.push(
      "Use the same wording as the job posting for your skills and tools — exact keyword matches are easier to find."
    );
    tips.push("List specific tools and technologies you've used rather than broad categories.");
    tips.push("Quantify your experience where you can (years used, project outcomes, scale).");
  }

  return { matched, missing, qualified, tips };
}

// `options.coverNote` only feeds the "possibly generic" hint — it never
// affects the score or verdict.
export function scoreCandidate(
  cvText: string,
  job: Job & { company?: { name: string } },
  options: { coverNote?: string | null } = {}
): Evaluation {
  const text = cvText.toLowerCase();

  const skillsMatch = scoreSkillsMatch(text, job);
  const building = scoreBuilding(text);
  const startupTolerance = scoreStartupTolerance(text);
  const trackRecord = scoreTrackRecord(text);
  const redFlags = scoreRedFlags(text, building.matched, skillsMatch.matched);

  const totalScore = clamp(
    Math.round(
      skillsMatch.score * WEIGHTS.skillsMatch +
        building.score * WEIGHTS.building +
        startupTolerance.score * WEIGHTS.startupTolerance +
        trackRecord.score * WEIGHTS.trackRecord +
        redFlags.score * WEIGHTS.redFlags
    )
  );

  const verdict: Verdict =
    totalScore >= 70 ? "COMPATIBLE" : totalScore >= 50 ? "BORDERLINE" : "NOT_COMPATIBLE";

  const dimensions: { name: string; result: DimensionResult; weightPct: number }[] = [
    { name: "Skills match with job", result: skillsMatch, weightPct: 30 },
    { name: "0→1 building evidence", result: building, weightPct: 25 },
    { name: "Startup/ambiguity tolerance", result: startupTolerance, weightPct: 20 },
    { name: "Track record of measurable impact", result: trackRecord, weightPct: 10 },
    { name: "Red flags", result: redFlags, weightPct: 15 },
  ];

  const toInsight = (d: (typeof dimensions)[number]): DimensionInsight => ({
    dimension: d.name,
    score: d.result.score,
    weightPct: d.weightPct,
    headline: d.result.headline,
    whyItMatters: WHY_IT_MATTERS[d.name] ?? "",
    keywords: d.result.matched.slice(0, 6),
  });

  const sorted = [...dimensions].sort((a, b) => b.result.score - a.result.score);

  const strengths = sorted
    .filter((d) => d.result.score >= 50)
    .slice(0, 3)
    .map(toInsight);

  const concerns = sorted
    .slice()
    .reverse()
    .filter((d) => d.result.score < 70)
    .slice(0, 3)
    .map(toInsight);

  const summary = buildSummary(
    totalScore,
    verdict,
    dimensions.map((d) => ({ name: d.name, score: d.result.score }))
  );

  const potential = buildPotential(
    {
      skillsMatch: skillsMatch.score,
      building: building.score,
      startupTolerance: startupTolerance.score,
      trackRecord: trackRecord.score,
      redFlags: redFlags.score,
    },
    totalScore
  );

  return {
    totalScore,
    verdict,
    skillsMatchScore: skillsMatch.score,
    buildingScore: building.score,
    startupToleranceScore: startupTolerance.score,
    trackRecordScore: trackRecord.score,
    redFlagScore: redFlags.score,
    summary,
    strengths: strengths.length > 0 ? strengths : [dimensions.map(toInsight)[0]],
    concerns: concerns.length > 0 ? concerns : [],
    potential,
    generic: detectGenericApplication(cvText, job, options.coverNote),
    dimensionDetails: dimensions.map(toInsight),
  };
}
