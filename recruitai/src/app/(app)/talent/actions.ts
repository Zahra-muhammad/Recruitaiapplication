"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { missingProfileParts, profileAsCvText } from "@/lib/applicantProfile";
import { scoreCvForJob } from "@/lib/scoringRun";
import { notifyApplicant } from "@/lib/notifications";
import { queueEmail, appUrl } from "@/lib/email";

// Each AI score costs a few cents, so one click scores at most this many.
const SCORE_BATCH = 10;
const CONCURRENCY = 3;

async function companyJob(jobId: string) {
  const session = await auth();
  if (!session?.user) return null;
  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId: session.user.companyId },
    include: { company: { select: { name: true } } },
  });
  return job ? { job, user: session.user } : null;
}

async function searchableProfile(applicantId: string) {
  const p = await prisma.applicant.findUnique({
    where: { id: applicantId },
    include: { experiences: { orderBy: { sortOrder: "asc" } }, educations: { orderBy: { sortOrder: "asc" } } },
  });
  return p && p.openToWork && missingProfileParts(p).length === 0 ? p : null;
}

// Scores the given open-to-work candidates against the job with the same
// AI scorer used for applications. Results are stored and reused.
export async function scoreTalent(jobId: string, applicantIds: string[]): Promise<{ scored: number; failed: number }> {
  const ctx = await companyJob(jobId);
  if (!ctx) return { scored: 0, failed: applicantIds.length };

  const queue = applicantIds.slice(0, SCORE_BATCH);
  let scored = 0;
  let failed = 0;
  const worker = async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      const profile = await searchableProfile(id);
      if (!profile) continue;
      try {
        await scoreCvForJob(profileAsCvText(profile), ctx.job);
        scored++;
      } catch (err) {
        console.error(`[talent] scoring ${id} for ${jobId} failed`, err);
        failed++;
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  revalidatePath("/talent");
  return { scored, failed };
}

// Invites an open-to-work candidate to apply: an in-app notification and an
// email with the job link. The recruiter sees contact details only if the
// candidate applies.
export async function inviteToApply(jobId: string, applicantId: string): Promise<{ ok: true } | { error: string }> {
  const ctx = await companyJob(jobId);
  if (!ctx) return { error: "Job not found." };
  if (ctx.job.status !== "OPEN") return { error: "Reopen this job before inviting candidates." };
  const profile = await searchableProfile(applicantId);
  if (!profile) return { error: "This candidate is no longer open to work." };

  const existing = await prisma.jobInvite.findUnique({ where: { jobId_applicantId: { jobId, applicantId } } });
  if (existing) return { ok: true };

  await prisma.jobInvite.create({ data: { jobId, applicantId, invitedById: ctx.user.id } });
  const link = `/jobs/${jobId}`;
  await notifyApplicant(
    applicantId,
    "JOB_INVITE",
    `${ctx.job.company.name} invited you to apply`,
    `They think you'd be a good fit for ${ctx.job.title}.`,
    link
  );
  await queueEmail({
    to: profile.email,
    subject: `${ctx.job.company.name} invited you to apply: ${ctx.job.title}`,
    body:
      `Hi ${profile.name.split(/\s+/)[0]},\n\n` +
      `${ctx.job.company.name} saw your RecruitAI profile and invited you to apply for ${ctx.job.title} (${ctx.job.location}).\n\n` +
      `See the role and apply here:\n${appUrl(link)}\n\n` +
      `You're getting this because your profile is set to "Open to work". You can switch that off any time in your profile.`,
    kind: "JOB_INVITE",
  });

  revalidatePath("/talent");
  revalidatePath(`/talent/${applicantId}`);
  return { ok: true };
}
