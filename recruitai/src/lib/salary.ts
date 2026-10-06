export const SALARY_CURRENCIES = ["USD", "EUR", "GBP", "AED", "PKR", "INR", "CAD", "AUD", "SGD"] as const;

// "$90k – $120k / year", or null for legacy postings with no range set.
export function formatSalaryRange(
  min: number | null,
  max: number | null,
  currency: string
): string | null {
  if (min == null || max == null) return null;
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const range = min === max ? fmt.format(min) : `${fmt.format(min)} – ${fmt.format(max)}`;
  return `${range} / year`;
}

// Validates the salary fields shared by job creation and the legacy
// "add a salary range" form. Throws a recruiter-readable error.
export function parseSalaryFields(formData: FormData): {
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
} {
  const salaryMin = Number(String(formData.get("salaryMin") || "").replace(/[, ]/g, ""));
  const salaryMax = Number(String(formData.get("salaryMax") || "").replace(/[, ]/g, ""));
  const currencyRaw = String(formData.get("salaryCurrency") || "USD");
  const salaryCurrency = (SALARY_CURRENCIES as readonly string[]).includes(currencyRaw) ? currencyRaw : "USD";

  if (!Number.isInteger(salaryMin) || !Number.isInteger(salaryMax) || salaryMin <= 0 || salaryMax <= 0) {
    throw new Error("A salary range (minimum and maximum, whole numbers) is required.");
  }
  if (salaryMin > salaryMax) {
    throw new Error("Salary minimum can't be higher than the maximum.");
  }
  return { salaryMin, salaryMax, salaryCurrency };
}
