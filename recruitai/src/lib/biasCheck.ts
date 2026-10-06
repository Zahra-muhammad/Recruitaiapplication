// Job-posting language check. Flags phrases linked to narrowing the
// applicant pool — gender-coded words, age-coded phrases, requirements not
// tied to the work, and aggressive tone — each with a reason and a suggested
// rewrite. It never edits text itself; the recruiter applies each change.
//
// Pure and dependency-free so it runs in the browser as the recruiter types.

export type BiasCategory = "Gender-coded" | "Age-coded" | "Unnecessarily narrow" | "Aggressive tone";

export interface BiasFlag {
  id: string;
  field: string;
  start: number;
  end: number;
  phrase: string;
  category: BiasCategory;
  explanation: string;
  suggestion: string;
  context: string;
}

interface Rule {
  pattern: RegExp;
  category: BiasCategory;
  explanation: string;
  // Given the matched text (and capture groups), the suggested replacement.
  suggest: (match: string, groups: string[]) => string;
}

const PRONOUNS: Record<string, string> = { he: "they", his: "their", him: "them", himself: "themselves" };
const MASCULINE_CODED: Record<string, string> = {
  aggressive: "ambitious",
  aggressively: "ambitiously",
  dominant: "leading",
  dominate: "lead",
  fearless: "confident",
  "killer instinct": "drive",
};

const RULES: Rule[] = [
  // ---- Gender-coded ----
  {
    pattern: /\b(rock ?stars?|ninjas?|gurus?|wizards?|jedis?|superheroes|superhero)\b/gi,
    category: "Gender-coded",
    explanation:
      "Slang like this reads as masculine-coded and has been linked to fewer women applying. It also doesn't say what skill you need.",
    suggest: (m) => (/s$/i.test(m) && !/ss$/i.test(m) ? "experts" : "expert"),
  },
  {
    pattern: /\b(he or she|he\/she|s\/he|she or he)\b/gi,
    category: "Gender-coded",
    explanation: "Binary phrasing excludes people who don't identify as either. \"They\" is simpler and inclusive.",
    suggest: () => "they",
  },
  {
    pattern: /\b(he|his|him|himself)\b/gi,
    category: "Gender-coded",
    explanation:
      "Using \"he\" for an unknown future hire implies the role is for a man. Use \"they\" (check the verb afterwards, e.g. \"they have\").",
    suggest: (m) => PRONOUNS[m.toLowerCase()] ?? "they",
  },
  {
    pattern: /\b(guys)\b/gi,
    category: "Gender-coded",
    explanation: "\"Guys\" defaults to men; a neutral word includes everyone.",
    suggest: () => "everyone",
  },
  {
    pattern: /\b(manpower|chairman|salesman|salesmen|man-hours|manning)\b/gi,
    category: "Gender-coded",
    explanation: "Gendered job and work terms have neutral equivalents.",
    suggest: (m) =>
      ({ manpower: "staffing", chairman: "chair", salesman: "salesperson", salesmen: "salespeople", "man-hours": "person-hours", manning: "staffing" })[
        m.toLowerCase()
      ] ?? m,
  },
  {
    pattern: /\b(aggressive(?:ly)?|dominant|dominate|fearless|killer instinct)\b/gi,
    category: "Gender-coded",
    explanation:
      "Masculine-coded words like this are associated with women finding a posting less appealing, without describing the work more precisely.",
    suggest: (m) => MASCULINE_CODED[m.toLowerCase()] ?? m,
  },

  // ---- Age-coded ----
  {
    pattern: /\bdigital natives?\b/gi,
    category: "Age-coded",
    explanation: "\"Digital native\" is a proxy for age. Describe the tools or skills you actually need.",
    suggest: () => "comfortable with digital tools",
  },
  {
    pattern: /\b(young(?: and (?:energetic|dynamic|hungry))?|youthful)\b/gi,
    category: "Age-coded",
    explanation: "Describing the ideal hire as young can discourage older applicants and raises age-discrimination risk.",
    suggest: () => "motivated",
  },
  {
    pattern: /\brecent (?:college |university )?grad(?:uate)?s?\b/gi,
    category: "Age-coded",
    explanation: "Asking for recent graduates screens by age. If it's an entry-level role, say that instead.",
    suggest: () => "early-career candidates",
  },
  {
    pattern: /\b(high[- ]energy|energetic)\b/gi,
    category: "Age-coded",
    explanation: "Often read as code for \"young\". Say what the work actually demands.",
    suggest: () => "motivated",
  },
  {
    pattern: /\b(\d+)\s*[-–]\s*\d+\s+years(?: of experience)?\b/gi,
    category: "Age-coded",
    explanation: "An upper limit on years of experience can screen out older, more experienced candidates. State a minimum instead.",
    suggest: (_m, g) => `${g[0]}+ years of experience`,
  },
  {
    pattern: /\b(no more than|maximum(?: of)?|max\.?|up to) (\d+) years(?: of experience)?\b/gi,
    category: "Age-coded",
    explanation: "Capping experience can screen out older candidates. If seniority is the concern, describe the level of the role.",
    suggest: () => "relevant experience",
  },
  {
    pattern: /\bover-?qualified\b/gi,
    category: "Age-coded",
    explanation: "\"Overqualified\" is frequently used against older applicants.",
    suggest: () => "a good fit for the level of this role",
  },

  // ---- Unnecessarily narrow ----
  {
    pattern:
      /\b(?:(?:a |an )?(?:bachelor'?s|master'?s|university|college|4-year)\s+)?degree (?:is )?(?:required|mandatory)\b|\bmust have (?:a |an )?(?:bachelor'?s |master'?s |university |college )?degree\b|\b(?:bs|ba|bsc|ms|msc|phd) required\b/gi,
    category: "Unnecessarily narrow",
    explanation: "A hard degree requirement excludes capable people with equivalent experience, unless the job legally needs one.",
    suggest: () => "degree or equivalent practical experience",
  },
  {
    pattern: /\bnative ([A-Za-z]+) speakers?\b/gi,
    category: "Unnecessarily narrow",
    explanation: "\"Native speaker\" is about where someone grew up, not their ability. Ask for the fluency the job needs.",
    suggest: (_m, g) => `fluent in ${g[0][0].toUpperCase()}${g[0].slice(1)}`,
  },
  {
    pattern: /\b(?:top|top-tier|ivy league|prestigious|elite|tier[- ]1)\s+(?:universit(?:y|ies)|schools?|colleges?)\b/gi,
    category: "Unnecessarily narrow",
    explanation: "Requiring a prestigious school screens on background and privilege rather than ability.",
    suggest: () => "relevant education or equivalent experience",
  },
  {
    pattern: /\bculture fit\b/gi,
    category: "Unnecessarily narrow",
    explanation: "\"Culture fit\" often becomes \"people like us\". Name the specific values or working style you mean.",
    suggest: () => "alignment with our values",
  },
  {
    pattern: /\b(clean[- ]shaven|able[- ]bodied|physically fit)\b/gi,
    category: "Unnecessarily narrow",
    explanation: "Physical requirements should describe the actual task (e.g. \"lift 20kg occasionally\"), and only if the job really needs it.",
    suggest: () => "able to perform the essential duties of the role",
  },

  // ---- Aggressive tone ----
  {
    pattern: /\bmust\b(?!-)/gi,
    category: "Aggressive tone",
    explanation:
      "Stacked \"musts\" read as a strict checklist. Many strong candidates, disproportionately women, won't apply unless they meet every item.",
    suggest: () => "should",
  },
  {
    pattern: /\bonly (?:candidates|applicants|people|those)\b|\b(?:only|strictly) (?:apply|consider)\b/gi,
    category: "Aggressive tone",
    explanation: "Exclusionary framing discourages people who'd be a good fit but aren't sure they qualify.",
    suggest: () => "we'd especially like to hear from candidates",
  },
  {
    pattern: /\b(asap|urgent(?:ly)?|immediately|immediate start)\b/gi,
    category: "Aggressive tone",
    explanation: "Urgency language suggests a high-pressure environment and can deter careful applicants.",
    suggest: () => "soon",
  },
  {
    pattern: /\bhit the ground running\b/gi,
    category: "Aggressive tone",
    explanation: "Implies no onboarding or support. Describe how quickly you actually need someone productive.",
    suggest: () => "get up to speed quickly",
  },
  {
    pattern: /\b(work hard,? play hard|whatever it takes|24\/7|high[- ]pressure|thick[- ]skinned)\b/gi,
    category: "Aggressive tone",
    explanation: "Signals long hours or a harsh environment, which deters caregivers and many experienced candidates.",
    suggest: (m) =>
      /24\/7/.test(m) ? "on a rotating on-call schedule" : /pressure/i.test(m) ? "fast-paced" : /thick/i.test(m) ? "resilient" : "committed to the team's goals",
  },
  {
    pattern: /!{2,}/g,
    category: "Aggressive tone",
    explanation: "Multiple exclamation marks read as shouting.",
    suggest: () => "!",
  },
];

// Keep the original's capitalisation ("He" → "They"). All-caps originals
// ("ASAP") are acronyms/shouting, not sentence starts, so they don't count.
function matchCase(original: string, replacement: string): string {
  const isCapitalisedWord = /^[A-Z][a-z]/.test(original) || /^[A-Z]$/.test(original);
  if (isCapitalisedWord && replacement) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

function contextAround(text: string, start: number, end: number): string {
  const from = Math.max(0, start - 40);
  const to = Math.min(text.length, end + 40);
  return `${from > 0 ? "…" : ""}${text.slice(from, to).replace(/\s+/g, " ")}${to < text.length ? "…" : ""}`;
}

// Replaces one occurrence and fixes a preceding "a"/"an" to agree with the
// replacement ("a rockstar" → "an expert").
export function applyBiasSuggestion(text: string, start: number, phrase: string, suggestion: string): string {
  let before = text.slice(0, start);
  const article = before.match(/\b(a|an|A|An)(\s+)$/);
  if (article) {
    const wantsAn = /^[aeiou]/i.test(suggestion);
    const fixed = wantsAn ? (article[1][0] === "A" ? "An" : "an") : article[1][0] === "A" ? "A" : "a";
    before = before.slice(0, before.length - article[0].length) + fixed + article[2];
  }
  return before + suggestion + text.slice(start + phrase.length);
}

export function checkJobPostingBias(fields: Record<string, string>): BiasFlag[] {
  const flags: BiasFlag[] = [];
  for (const [field, text] of Object.entries(fields)) {
    if (!text) continue;
    const taken: [number, number][] = [];
    // id = field + phrase + which occurrence it is — stable when an earlier
    // edit shifts character positions, so a dismissed flag stays dismissed.
    const seen = new Map<string, number>();
    for (const rule of RULES) {
      for (const m of text.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags))) {
        const start = m.index ?? 0;
        const end = start + m[0].length;
        // One flag per span — the more specific rule (listed first) wins.
        if (taken.some(([s, e]) => start < e && end > s)) continue;
        taken.push([start, end]);
        const groups = m.slice(1).filter((g): g is string => g !== undefined);
        const key = `${field}:${m[0].toLowerCase()}`;
        const nth = (seen.get(key) ?? 0) + 1;
        seen.set(key, nth);
        flags.push({
          id: `${key}:${nth}`,
          field,
          start,
          end,
          phrase: m[0],
          category: rule.category,
          explanation: rule.explanation,
          suggestion: matchCase(m[0], rule.suggest(m[0], groups)),
          context: contextAround(text, start, end),
        });
      }
    }
  }
  return flags.sort((a, b) => (a.field === b.field ? a.start - b.start : 0));
}
