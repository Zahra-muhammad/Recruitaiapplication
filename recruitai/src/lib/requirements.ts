// Parses a job's "key skills / requirements" field and matches it against CV
// text. The single source of truth — scoring, the applicant fit check, and
// the public job pages must all agree on what the requirements are.
//
// The field comes in two shapes:
//   - a short skills list:    "React, Node.js / AWS; PostgreSQL"
//   - requirement sentences:  "3+ years in growth marketing ... \n Hands-on
//                              experience running paid campaigns ..."
// Sentences often arrive with their line breaks lost (pasted into a
// single-line input), so they're also split on sentence-like boundaries.

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for", "with", "by", "from",
  "as", "is", "are", "be", "not", "just", "only", "purely", "similar", "etc", "like", "such",
  "your", "you", "our", "we", "who", "that", "this", "their", "its", "into", "within",
  "experience", "experienced", "years", "year", "plus", "strong", "good", "solid", "proven",
  "ability", "able", "comfortable", "working", "work", "hands", "knowledge", "understanding",
  "familiarity", "familiar", "level", "basic", "real", "directly", "least", "minimum",
]);

// A requirement longer than this is treated as a sentence and matched by its
// key terms; shorter ones are named skills and matched as whole phrases.
const SKILL_MAX_WORDS = 4;

// A sentence requirement counts as met when at least this share of its key
// terms appear in the CV.
const SENTENCE_MATCH_THRESHOLD = 0.5;

const BULLET_PREFIX = /^\s*(?:[-*•●▪◦]|\d+[.)])\s*/;

export function isShortSkill(requirement: string): boolean {
  return wordCount(requirement) <= SKILL_MAX_WORDS;
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function clean(s: string): string {
  return s.replace(BULLET_PREFIX, "").replace(/\s+/g, " ").trim();
}

// A requirement never ends on one of these, so a capital letter right after
// one is a proper noun mid-sentence ("with React"), not a new requirement.
const CONNECTORS = new Set([
  "a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for", "with", "by", "from",
  "using", "like", "including", "via", "as", "e.g.", "i.e.", "such",
]);

// Splits run-together sentences: "...content marketing) Hands-on experience..."
// A capitalised word only starts a new requirement if the fragment before it
// is at least 3 words and doesn't end on a connector — otherwise it's a
// proper noun mid-sentence ("Experience with React and Node") and is glued back.
function splitSentences(text: string): string[] {
  const pieces = text.split(/(?<=[a-z0-9)\].])\s+(?=[A-Z][a-z])/);
  const merged: string[] = [];
  for (const piece of pieces) {
    const prev = merged[merged.length - 1];
    const prevLastWord = prev?.split(/\s+/).pop()?.toLowerCase() ?? "";
    if (prev !== undefined && (wordCount(prev) < 3 || CONNECTORS.has(prevLastWord))) {
      merged[merged.length - 1] = `${prev} ${piece}`;
    } else {
      merged.push(piece);
    }
  }
  return merged;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Whole-word phrase match that still works for skills with symbols ("C++",
// "Node.js", ".NET"): "Go" must not match "good", nor "Java" "JavaScript".
export function containsPhrase(haystack: string, phrase: string): boolean {
  return new RegExp(`(?<![a-z0-9])${escapeRegExp(phrase)}(?![a-z0-9])`).test(haystack);
}

export function parseRequirements(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];

  let items: string[];
  if (/\n/.test(text)) {
    // One requirement per line (or bullet).
    items = text.split(/\n+/);
  } else {
    const commaParts = text.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const isShortList = commaParts.every((p) => wordCount(p) <= SKILL_MAX_WORDS);
    items = isShortList
      ? commaParts.flatMap((p) => p.split(/\s+\/\s+|\/(?=\S)/)) // "React/Node" -> two skills
      : splitSentences(text);
  }

  const seen = new Set<string>();
  return items
    .map(clean)
    .filter((s) => {
      const key = s.toLowerCase();
      if (!s || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function keyTerms(requirement: string): string[] {
  const terms = requirement.toLowerCase().match(/[a-z][a-z0-9+#.-]*[a-z0-9+#]|[a-z]/g) ?? [];
  return Array.from(new Set(terms.filter((t) => t.length >= 3 && !STOPWORDS.has(t))));
}

// Light stemming so "campaigns"/"campaign" and "dashboards"/"dashboard" match
// without pulling in an NLP dependency.
function stem(term: string): string {
  return term.length > 5 ? term.slice(0, Math.max(5, term.length - 3)) : term;
}

export function requirementMatches(requirement: string, cvText: string): boolean {
  const cv = cvText.toLowerCase();
  const req = requirement.toLowerCase().trim();

  if (wordCount(req) <= SKILL_MAX_WORDS) return containsPhrase(cv, req);

  const terms = keyTerms(req);
  if (terms.length === 0) return containsPhrase(cv, req);
  const cvWords = cv.match(/[a-z][a-z0-9+#.-]*[a-z0-9+#]|[a-z]/g) ?? [];
  const hits = terms.filter((t) => {
    const s = stem(t);
    return cvWords.some((w) => w.startsWith(s));
  });
  return hits.length / terms.length >= SENTENCE_MATCH_THRESHOLD;
}

export function matchRequirements(
  cvText: string,
  keySkills: string
): { matched: string[]; missing: string[] } {
  const matched: string[] = [];
  const missing: string[] = [];
  for (const req of parseRequirements(keySkills)) {
    (requirementMatches(req, cvText) ? matched : missing).push(req);
  }
  return { matched, missing };
}

// Turns a requirement into a short noun phrase that reads naturally inside a
// sentence ("Your experience in ___"): drops parentheticals, trailing
// qualifiers, and lead-ins like "3+ years in" / "Hands-on experience with".
//   "3+ years in growth or performance marketing (not purely brand…)" → "growth or performance marketing"
//   "Comfortable working directly with data — pulling reports, …"      → "working directly with data"
export function shortRequirementLabel(requirement: string): string {
  let s = requirement
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+[—–-]\s+|;|,\s*not\b|\s+not just\b/)[0]
    .replace(/\s+/g, " ")
    .trim();

  const LEAD_INS = [
    /^\d+\+?\s*(?:years?|yrs)\s*(?:of\s+)?(?:experience\s+)?(?:in|with|of|as|doing)?\s*/i,
    /^(?:hands-on\s+|proven\s+|strong\s+|solid\s+|deep\s+)?(?:experience|expertise|proficiency|familiarity|knowledge|background)\s*(?:with|in|of|using)?\s*/i,
    /^(?:comfortable|confident|able|ability)\s*(?:to\s+|with\s+)?/i,
  ];
  for (const re of LEAD_INS) s = s.replace(re, "");
  s = s.replace(/^(?:a|an)\s+/i, "").replace(/[.,;:]+$/, "").trim();
  if (!s) return requirement.trim();
  // Lower-case the first letter unless it's an acronym or a proper name like "React".
  return /^[A-Z][a-z]/.test(s) && !isShortSkill(s) ? s[0].toLowerCase() + s.slice(1) : s;
}
