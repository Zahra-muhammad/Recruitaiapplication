import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Ghost-job prevention. Recruiters are nudged to re-confirm an open role
// after REVERIFY_AFTER_DAYS; after AUTO_CLOSE_AFTER_DAYS without confirmation
// the role is closed and drops off the public board (it stays visible, marked
// auto-closed, in the recruiter dashboard).
export const REVERIFY_AFTER_DAYS = 14;
export const AUTO_CLOSE_AFTER_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / DAY_MS);
}

export function needsReverification(job: { status: string; lastVerifiedActive: Date }): boolean {
  return job.status === "OPEN" && daysSince(job.lastVerifiedActive) >= REVERIFY_AFTER_DAYS;
}

// Applicant-facing trust signal, e.g. "Verified active today".
export function verifiedActiveLabel(lastVerifiedActive: Date): string {
  const days = daysSince(lastVerifiedActive);
  if (days <= 0) return "Verified active today";
  if (days === 1) return "Verified active yesterday";
  return `Verified active ${days} days ago`;
}

// The only definition of "publicly visible job". Filtering on the date too
// (not just status) means a stale job disappears the moment it crosses the
// line, even before closeStaleJobs() has recorded it as CLOSED.
export function publicJobWhere(): Prisma.JobWhereInput {
  return {
    status: "OPEN",
    lastVerifiedActive: { gte: new Date(Date.now() - AUTO_CLOSE_AFTER_DAYS * DAY_MS) },
  };
}

// Persists the auto-close. Idempotent and cheap (one UPDATE), so it's run
// lazily on dashboard and job-board loads instead of needing a cron job.
export async function closeStaleJobs(companyId?: string) {
  await prisma.job.updateMany({
    where: {
      status: "OPEN",
      lastVerifiedActive: { lt: new Date(Date.now() - AUTO_CLOSE_AFTER_DAYS * DAY_MS) },
      ...(companyId ? { companyId } : {}),
    },
    data: { status: "CLOSED", autoClosedAt: new Date() },
  });
}
