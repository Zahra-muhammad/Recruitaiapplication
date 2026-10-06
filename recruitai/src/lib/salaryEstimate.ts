// PLACEHOLDER salary estimate — no market data source is connected yet.
// Rough built-in figures (annual base, USD, mid-level, US national) adjusted
// by seniority and location, then converted at approximate fixed rates. It is
// always shown labelled as an estimate to verify, never as a fact. Replace
// estimateSalary()'s internals with a real data source; keep its signature.

export interface SalaryEstimate {
  min: number;
  max: number;
  currency: string;
  basis: string[]; // what the estimate assumed, shown to the recruiter
}

// Annual base salary bands, USD, mid-level, US national.
const ROLE_FAMILIES: { label: string; pattern: RegExp; min: number; max: number }[] = [
  { label: "Machine learning / data science", pattern: /\b(machine learning|ml|data scien|ai engineer)/i, min: 125_000, max: 165_000 },
  { label: "Engineering", pattern: /\b(engineer|engineering|developer|software|front-?end|back-?end|full-?stack|devops|sre|mobile|ios|android|programmer)\b/i, min: 110_000, max: 150_000 },
  { label: "Data analysis", pattern: /\b(data analyst|analytics|business intelligence|bi analyst|analyst)\b/i, min: 75_000, max: 100_000 },
  { label: "Product management", pattern: /\b(product manager|product owner|product lead|head of product)\b/i, min: 115_000, max: 150_000 },
  { label: "Design", pattern: /\b(designer|design|ux|ui)\b/i, min: 90_000, max: 125_000 },
  { label: "Marketing", pattern: /\b(marketing|marketer|growth|seo|content|brand|social media|communications)\b/i, min: 75_000, max: 105_000 },
  { label: "Sales", pattern: /\b(sales|account executive|sdr|bdr|business development|account manager)\b/i, min: 65_000, max: 95_000 },
  { label: "Customer success / support", pattern: /\b(customer success|customer support|support|customer service)\b/i, min: 55_000, max: 80_000 },
  { label: "Finance", pattern: /\b(finance|financial|accountant|accounting|controller|bookkeep)/i, min: 75_000, max: 105_000 },
  { label: "People / HR", pattern: /\b(hr|human resources|people|recruiter|talent)\b/i, min: 65_000, max: 90_000 },
  { label: "Operations", pattern: /\b(operations|ops|project manager|program manager|coordinator)\b/i, min: 70_000, max: 100_000 },
];

const SENIORITY_FACTORS: Record<string, { label: string; factor: number }> = {
  ENTRY: { label: "Entry-level", factor: 0.7 },
  MID: { label: "Mid-level", factor: 1 },
  SENIOR: { label: "Senior", factor: 1.3 },
  LEAD: { label: "Lead", factor: 1.55 },
  EXECUTIVE: { label: "Executive", factor: 1.9 },
};

// Relative to the US national level. First match wins, so specific cities
// come before their country.
const LOCATION_FACTORS: { label: string; pattern: RegExp; factor: number }[] = [
  { label: "SF Bay Area / NYC / Seattle", pattern: /\b(san francisco|sf|bay area|new york|nyc|seattle|palo alto)\b/i, factor: 1.2 },
  { label: "London", pattern: /\blondon\b/i, factor: 0.85 },
  { label: "United States", pattern: /\b(usa|us|united states|boston|austin|chicago|los angeles|denver|atlanta|miami)\b/i, factor: 1 },
  { label: "Canada", pattern: /\b(canada|toronto|vancouver|montreal)\b/i, factor: 0.8 },
  { label: "United Kingdom", pattern: /\b(uk|united kingdom|manchester|edinburgh|england)\b/i, factor: 0.75 },
  { label: "Western Europe", pattern: /\b(germany|berlin|munich|netherlands|amsterdam|france|paris|ireland|dublin|switzerland|zurich|spain|madrid|barcelona)\b/i, factor: 0.72 },
  { label: "Australia", pattern: /\b(australia|sydney|melbourne)\b/i, factor: 0.8 },
  { label: "Singapore", pattern: /\bsingapore\b/i, factor: 0.75 },
  { label: "UAE", pattern: /\b(uae|dubai|abu dhabi|sharjah|united arab emirates)\b/i, factor: 0.7 },
  { label: "Saudi Arabia", pattern: /\b(saudi|riyadh|jeddah|ksa)\b/i, factor: 0.65 },
  { label: "India", pattern: /\b(india|bangalore|bengaluru|mumbai|delhi|hyderabad|pune|chennai)\b/i, factor: 0.18 },
  { label: "Pakistan", pattern: /\b(pakistan|karachi|lahore|islamabad)\b/i, factor: 0.08 },
  { label: "Egypt", pattern: /\b(egypt|cairo)\b/i, factor: 0.1 },
  { label: "Philippines", pattern: /\b(philippines|manila)\b/i, factor: 0.12 },
  { label: "Remote", pattern: /\bremote\b/i, factor: 0.9 },
];

// Approximate fixed conversion rates from USD. Not live.
const USD_TO: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, AED: 3.67, PKR: 280, INR: 83, CAD: 1.36, AUD: 1.5, SGD: 1.34,
};

// Two significant figures — an estimate shouldn't look more precise than it is.
function roundEstimate(n: number): number {
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / magnitude) * magnitude;
}

export function estimateSalary(input: {
  title: string;
  seniority: string;
  location: string;
  currency: string;
}): SalaryEstimate | null {
  const role = ROLE_FAMILIES.find((r) => r.pattern.test(input.title));
  if (!role) return null;

  const seniority = SENIORITY_FACTORS[input.seniority] ?? SENIORITY_FACTORS.MID;
  const location = LOCATION_FACTORS.find((l) => l.pattern.test(input.location));
  const rate = USD_TO[input.currency] ?? 1;
  const currency = USD_TO[input.currency] ? input.currency : "USD";
  const factor = seniority.factor * (location?.factor ?? 1) * rate;

  return {
    min: roundEstimate(role.min * factor),
    max: roundEstimate(role.max * factor),
    currency,
    basis: [
      role.label,
      seniority.label,
      location ? location.label : "location not recognised — US figures used",
      ...(currency !== "USD" ? [`approximate USD→${currency} rate`] : []),
    ],
  };
}
