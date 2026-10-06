// Natural-language pipeline search, rule-based. Turns a recruiter's plain
// question ("candidates with fintech experience who mentioned Python and
// scored above 60") into structured filters, and reports back how it was
// interpreted so a misreading is visible rather than silently wrong.
//
// Kept pure (no DB access) so the parser can later be swapped for an LLM
// call that returns the same ParsedPipelineQuery shape.

import { containsPhrase } from "@/lib/requirements";

export type VerdictValue = "COMPATIBLE" | "BORDERLINE" | "NOT_COMPATIBLE";

export interface ConceptTerm {
  label: string;
  // Any one of these phrases counts as a match (synonyms / "X or Y").
  anyOf: string[];
}

export interface ParsedPipelineQuery {
  minScore?: number;
  maxScore?: number;
  verdicts: VerdictValue[];
  statuses: string[];
  source?: "APPLIED" | "RECRUITER_UPLOADED";
  genericOnly: boolean;
  mentions: ConceptTerm[];
  missing: ConceptTerm[];
  // Parts of the query recognised but not searchable, reported back.
  ignored: string[];
}

export interface PipelineCandidate {
  id: string;
  text: string; // CV text + cover note + listed qualifications
  score: number;
  verdict: string; // effective verdict (manual override wins)
  status: string;
  source: string;
  genericFlag: boolean;
}

// Common shorthand → phrasings that show up in CVs.
const SYNONYMS: Record<string, string[]> = {
  fintech: ["fintech", "financial technology", "payments", "banking", "neobank", "lending", "insurtech"],
  startup: ["startup", "start-up", "seed-stage", "seed stage", "early-stage", "early stage", "series a", "pre-seed", "founding"],
  "startup experience": ["startup", "start-up", "seed-stage", "seed stage", "early-stage", "early stage", "series a", "pre-seed", "founding"],
  ecommerce: ["e-commerce", "ecommerce", "online retail", "shopify", "marketplace"],
  "e-commerce": ["e-commerce", "ecommerce", "online retail", "shopify", "marketplace"],
  saas: ["saas", "software as a service", "subscription software"],
  ml: ["machine learning", "ml", "deep learning"],
  "machine learning": ["machine learning", "ml", "deep learning"],
  ai: ["ai", "artificial intelligence", "machine learning", "llm", "llms"],
  js: ["javascript", "js"],
  javascript: ["javascript", "js"],
  ts: ["typescript", "ts"],
  leadership: ["led", "managed", "team lead", "head of", "manager", "mentored"],
  management: ["managed", "manager", "team lead", "head of"],
  founder: ["founder", "co-founder", "founded"],
  "paid ads": ["paid ads", "paid social", "paid acquisition", "meta ads", "google ads", "ppc"],
  sql: ["sql", "postgresql", "mysql", "bigquery"],
};

// Words that carry no search meaning in a question about candidates.
const FILLER = new Set([
  "candidates", "candidate", "people", "person", "anyone", "someone", "applicants", "applicant",
  "who", "whom", "with", "has", "have", "had", "having", "mentioned", "mention", "mentions",
  "mentioning", "experience", "experienced", "background", "backgrounds", "in", "of", "the", "a",
  "an", "show", "find", "list", "me", "all", "that", "some", "any", "knows", "know", "knowing",
  "worked", "working", "work", "skills", "skill", "strong", "good", "plus", "using", "used",
  "are", "is", "was", "were", "and", "at", "on", "for", "to", "from", "they", "their", "them",
  "which", "whose", "also", "both", "either", "somewhere", "cv", "cvs", "resume", "resumes",
  "background", "doing", "did", "do", "does", "been", "be", "please", "give", "get",
]);

const STATUS_PHRASES: [RegExp, string][] = [
  [/\b(not moving forward|rejected|declined)\b/, "NOT_MOVING_FORWARD"],
  [/\b(in review|under review|being reviewed)\b/, "IN_REVIEW"],
  [/\b(interviewing|in interviews?|interview stage)\b/, "INTERVIEWING"],
  [/\b(offers?|offer stage|offered)\b/, "OFFER"],
  [/\bhired\b/, "HIRED"],
  [/\b(new|unreviewed|received|not yet reviewed)\b/, "RECEIVED"],
];

function toConcept(raw: string): ConceptTerm | null {
  const label = raw.trim().replace(/^["']|["']$/g, "");
  if (!label) return null;
  return { label, anyOf: SYNONYMS[label] ?? [label] };
}

// Splits leftover text into concept terms: runs of non-filler words become
// one phrase ("machine learning"); "X or Y" becomes one either/or concept.
function extractConcepts(text: string): ConceptTerm[] {
  const concepts: ConceptTerm[] = [];

  // Quoted phrases are taken verbatim.
  text = text.replace(/"([^"]+)"/g, (_, phrase: string) => {
    const c = toConcept(phrase.toLowerCase());
    if (c) concepts.push(c);
    return " , ";
  });

  for (const clause of text.split(/,|;|\band\b|\bwho\b|\bwith\b|\bbut\b/)) {
    const alternatives = clause.split(/\bor\b/);
    const groups = alternatives
      .map((alt) => {
        const words = alt.split(/\s+/).filter((w) => w && !FILLER.has(w));
        return words.join(" ").replace(/[?.!]+$/, "").trim();
      })
      .filter((phrase) => phrase.length > 1);

    if (groups.length === 0) continue;
    if (groups.length === 1) {
      const c = toConcept(groups[0]);
      if (c) concepts.push(c);
    } else {
      concepts.push({
        label: groups.join(" or "),
        anyOf: groups.flatMap((g) => SYNONYMS[g] ?? [g]),
      });
    }
  }
  return concepts;
}

export function parsePipelineQuery(input: string): ParsedPipelineQuery {
  let q = ` ${input.toLowerCase().replace(/[’']/g, "'")} `;
  const parsed: ParsedPipelineQuery = {
    verdicts: [],
    statuses: [],
    genericOnly: false,
    mentions: [],
    missing: [],
    ignored: [],
  };
  const consume = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    q = q.replace(re, (...args) => {
      fn(args.slice(0, -2) as unknown as RegExpMatchArray);
      return " , ";
    });
  };

  // Score constraints. Needs the word "score"/"points" nearby so "over 5
  // years" isn't read as a score.
  const SCORE = String.raw`(?:scor(?:e|ed|es|ing)|rated|rating)\s*(?:of\s*|is\s*)?`;
  consume(new RegExp(`${SCORE}between\\s*(\\d{1,3})\\s*(?:and|-|to)\\s*(\\d{1,3})`, "g"), (m) => {
    parsed.minScore = Number(m[1]);
    parsed.maxScore = Number(m[2]);
  });
  consume(new RegExp(`${SCORE}(above|over|more than|greater than|higher than|>)\\s*(\\d{1,3})`, "g"), (m) => {
    parsed.minScore = Number(m[2]) + 1;
  });
  consume(new RegExp(`${SCORE}(at least|min(?:imum)?(?: of)?|>=|\\d{1,3}\\+)\\s*(\\d{1,3})?`, "g"), (m) => {
    const n = m[2] ?? m[1].replace("+", "");
    if (/^\d+$/.test(n)) parsed.minScore = Number(n);
  });
  consume(new RegExp(`${SCORE}(below|under|less than|lower than|<)\\s*(\\d{1,3})`, "g"), (m) => {
    parsed.maxScore = Number(m[2]) - 1;
  });
  consume(new RegExp(`${SCORE}(at most|max(?:imum)?(?: of)?|<=)\\s*(\\d{1,3})`, "g"), (m) => {
    parsed.maxScore = Number(m[2]);
  });
  consume(/\b(above|over|at least|below|under)\s*(\d{1,3})\s*(?:points|\/100)/g, (m) => {
    const n = Number(m[2]);
    if (m[1] === "above" || m[1] === "over") parsed.minScore = n + 1;
    else if (m[1] === "at least") parsed.minScore = n;
    else parsed.maxScore = n - 1;
  });

  // Verdicts ("not compatible" first so it isn't read as "compatible").
  consume(/\b(not compatible|incompatible)\b/g, () => parsed.verdicts.push("NOT_COMPATIBLE"));
  consume(/\bcompatible\b/g, () => parsed.verdicts.push("COMPATIBLE"));
  consume(/\bborderline\b/g, () => parsed.verdicts.push("BORDERLINE"));

  for (const [re, status] of STATUS_PHRASES) {
    consume(new RegExp(re.source, "g"), () => parsed.statuses.push(status));
  }

  // Years of experience can't be measured reliably from CV text — say so
  // rather than searching for the literal phrase.
  consume(/\b(?:over|more than|at least|min(?:imum)?(?: of)?)?\s*\d+\+?\s*(?:years?|yrs)\b(?:\s*of)?/g, (m) => {
    parsed.ignored.push(`"${m[0].trim()}" (years of experience can't be read reliably from CVs yet)`);
  });

  consume(/\b(?:who )?applied(?: themselves| directly| through the careers page)?\b|\bapplicants only\b/g, () => {
    parsed.source = "APPLIED";
  });
  consume(/\b(uploaded|sourced|recruiter[- ]uploaded)\b/g, () => {
    parsed.source = "RECRUITER_UPLOADED";
  });

  consume(/\b(generic|possibly generic|templated?)\s*(applications?|cvs?)?\b/g, () => {
    parsed.genericOnly = true;
  });

  // Negations: "missing SQL", "without startup experience", "no Python".
  consume(
    /\b(?:missing|without|lacking|no|not mentioning|doesn't mention|don't mention|doesn't have|don't have)\s+(.+?)(?=\s*(?:,|;|\band\b|\bbut\b|\bwho\b|$))/g,
    (m) => {
      for (const c of extractConcepts(m[1])) parsed.missing.push(c);
    }
  );

  parsed.mentions = extractConcepts(q);
  parsed.verdicts = [...new Set(parsed.verdicts)];
  parsed.statuses = [...new Set(parsed.statuses)];
  return parsed;
}

function mentionsConcept(text: string, concept: ConceptTerm): boolean {
  return concept.anyOf.some((phrase) => containsPhrase(text, phrase));
}

export function matchesPipelineQuery(c: PipelineCandidate, q: ParsedPipelineQuery): boolean {
  if (q.minScore !== undefined && c.score < q.minScore) return false;
  if (q.maxScore !== undefined && c.score > q.maxScore) return false;
  if (q.verdicts.length > 0 && !q.verdicts.includes(c.verdict as VerdictValue)) return false;
  if (q.statuses.length > 0 && !q.statuses.includes(c.status)) return false;
  if (q.source && c.source !== q.source) return false;
  if (q.genericOnly && !c.genericFlag) return false;

  const text = c.text.toLowerCase();
  if (!q.mentions.every((concept) => mentionsConcept(text, concept))) return false;
  if (q.missing.some((concept) => mentionsConcept(text, concept))) return false;
  return true;
}

const VERDICT_LABELS: Record<string, string> = {
  COMPATIBLE: "Compatible",
  BORDERLINE: "Borderline",
  NOT_COMPATIBLE: "Not compatible",
};
const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  IN_REVIEW: "In review",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  HIRED: "Hired",
  NOT_MOVING_FORWARD: "Not moving forward",
};

function describeConcept(c: ConceptTerm): string {
  const extras = c.anyOf.filter((p) => p !== c.label);
  return extras.length > 0 ? `"${c.label}" (or ${extras.slice(0, 3).join(", ")}${extras.length > 3 ? "…" : ""})` : `"${c.label}"`;
}

// Plain-language readback of what the parser understood.
export function describePipelineQuery(q: ParsedPipelineQuery): string[] {
  const parts: string[] = [];
  for (const c of q.mentions) parts.push(`mentions ${describeConcept(c)}`);
  for (const c of q.missing) parts.push(`doesn't mention ${describeConcept(c)}`);
  if (q.minScore !== undefined && q.maxScore !== undefined) parts.push(`score ${q.minScore}–${q.maxScore}`);
  else if (q.minScore !== undefined) parts.push(`score ≥ ${q.minScore}`);
  else if (q.maxScore !== undefined) parts.push(`score ≤ ${q.maxScore}`);
  if (q.verdicts.length) parts.push(`verdict: ${q.verdicts.map((v) => VERDICT_LABELS[v]).join(" or ")}`);
  if (q.statuses.length) parts.push(`status: ${q.statuses.map((s) => STATUS_LABELS[s]).join(" or ")}`);
  if (q.source) parts.push(q.source === "APPLIED" ? "applied themselves" : "uploaded by a recruiter");
  if (q.genericOnly) parts.push("flagged as possibly generic");
  for (const i of q.ignored) parts.push(`ignored ${i}`);
  return parts;
}
