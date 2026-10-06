// The candidate's LinkedIn-style profile: what "complete" means, input
// validation for the editor, and the plain-text version recruiters' talent
// search scores against a job (same AI scorer as CVs).

import type { Applicant, ApplicantEducation, ApplicantExperience } from "@prisma/client";
import { cityByKey, cityLabel } from "@/lib/cities";

export interface ExperienceInput {
  title: string;
  company: string;
  location: string;
  startDate: string; // YYYY-MM
  endDate: string; // YYYY-MM, or "" for a current role
  description: string;
}

export interface EducationInput {
  school: string;
  qualification: string;
  field: string;
  startYear: string;
  endYear: string;
}

export type FullProfile = Applicant & {
  experiences: ApplicantExperience[];
  educations: ApplicantEducation[];
};

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const LIMITS = { short: 150, description: 3000, about: 3000, entries: 30 };

// Server-side check of the editor's JSON. Returns cleaned rows or a
// message naming the row that's wrong.
export function parseExperiences(raw: string): { rows: ExperienceInput[] } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(raw || "[]");
  } catch {
    return { error: "Experience couldn't be read — please try again." };
  }
  if (!Array.isArray(data)) return { error: "Experience couldn't be read — please try again." };
  const rows: ExperienceInput[] = [];
  for (const [i, item] of data.slice(0, LIMITS.entries).entries()) {
    const r = item as Partial<ExperienceInput>;
    const row: ExperienceInput = {
      title: String(r.title ?? "").trim().slice(0, LIMITS.short),
      company: String(r.company ?? "").trim().slice(0, LIMITS.short),
      location: String(r.location ?? "").trim().slice(0, LIMITS.short),
      startDate: String(r.startDate ?? "").trim(),
      endDate: String(r.endDate ?? "").trim(),
      description: String(r.description ?? "").trim().slice(0, LIMITS.description),
    };
    if (!row.title && !row.company && !row.description) continue; // empty row
    const label = `Experience #${i + 1}${row.title ? ` (${row.title})` : ""}`;
    if (!row.title || !row.company) return { error: `${label}: add a job title and company.` };
    if (!MONTH.test(row.startDate)) return { error: `${label}: add a start month.` };
    if (row.endDate && !MONTH.test(row.endDate)) return { error: `${label}: the end month isn't valid.` };
    if (row.endDate && row.endDate < row.startDate) return { error: `${label}: the end month is before the start.` };
    rows.push(row);
  }
  return { rows };
}

export function parseEducations(raw: string): { rows: EducationInput[] } | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(raw || "[]");
  } catch {
    return { error: "Education couldn't be read — please try again." };
  }
  if (!Array.isArray(data)) return { error: "Education couldn't be read — please try again." };
  const rows: EducationInput[] = [];
  for (const [i, item] of data.slice(0, LIMITS.entries).entries()) {
    const r = item as Partial<EducationInput>;
    const row: EducationInput = {
      school: String(r.school ?? "").trim().slice(0, LIMITS.short),
      qualification: String(r.qualification ?? "").trim().slice(0, LIMITS.short),
      field: String(r.field ?? "").trim().slice(0, LIMITS.short),
      startYear: String(r.startYear ?? "").trim(),
      endYear: String(r.endYear ?? "").trim(),
    };
    if (!row.school && !row.qualification) continue;
    if (!row.school || !row.qualification) {
      return { error: `Education #${i + 1}: add the school and the qualification.` };
    }
    for (const y of [row.startYear, row.endYear]) {
      if (y && !/^(19|20)\d{2}$/.test(y)) return { error: `Education #${i + 1}: years must look like 2019.` };
    }
    rows.push(row);
  }
  return { rows };
}

// What's still needed before the profile counts as complete (and before
// "Open to work" can be switched on). Location stays optional.
export function missingProfileParts(p: {
  name: string;
  headline: string | null;
  about: string | null;
  skills: string | null;
  experiences: unknown[];
  educations: unknown[];
}): string[] {
  const missing: string[] = [];
  if (!p.name.trim()) missing.push("Full name");
  if (!p.headline?.trim()) missing.push("Headline");
  if (!p.about?.trim() || p.about.trim().length < 50) missing.push("About (at least a few sentences)");
  if (!p.skills?.trim()) missing.push("Skills");
  if (p.experiences.length === 0 && p.educations.length === 0) missing.push("At least one experience or education entry");
  return missing;
}

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-GB", { month: "short", year: "numeric" });
};

export function dateRange(start: string, end: string | null): string {
  return `${monthLabel(start)} – ${end ? monthLabel(end) : "Present"}`;
}

// The profile as CV-like text for the AI scorer. Contact details are left
// out — the scorer never needs them.
export function profileAsCvText(p: FullProfile): string {
  const lines: string[] = [p.name];
  if (p.headline) lines.push(p.headline);
  const city = cityByKey(p.city);
  if (city || p.location) lines.push(city ? cityLabel(city) : p.location!);
  if (p.about) lines.push("", "Summary", p.about);
  if (p.experiences.length) {
    lines.push("", "Experience");
    for (const e of p.experiences) {
      lines.push(`${e.title}, ${e.company}${e.location ? ` (${e.location})` : ""} — ${e.startDate} to ${e.endDate ?? "present"}`);
      if (e.description) lines.push(e.description);
    }
  }
  if (p.educations.length) {
    lines.push("", "Education");
    for (const ed of p.educations) {
      const years = [ed.startYear, ed.endYear].filter(Boolean).join("–");
      lines.push(`${ed.qualification}${ed.field ? ` in ${ed.field}` : ""}, ${ed.school}${years ? `, ${years}` : ""}`);
    }
  }
  if (p.skills) lines.push("", "Skills", p.skills);
  if (p.languages) lines.push("", "Languages", p.languages);
  return lines.join("\n");
}
