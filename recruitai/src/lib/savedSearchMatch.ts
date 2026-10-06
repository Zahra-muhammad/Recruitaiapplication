import type { Job, SavedSearch } from "@prisma/client";
import { parseRequirements } from "@/lib/requirements";

export function jobMatchesSavedSearch(job: Job, search: SavedSearch): boolean {
  if (search.query) {
    const q = search.query.toLowerCase();
    if (!`${job.title} ${job.description}`.toLowerCase().includes(q)) return false;
  }
  if (search.location && job.location !== search.location) return false;
  if (search.seniority && job.seniority !== search.seniority) return false;
  if (search.skill) {
    const skills = parseRequirements(job.keySkills).map((s) => s.toLowerCase());
    if (!skills.includes(search.skill.toLowerCase())) return false;
  }
  return true;
}
