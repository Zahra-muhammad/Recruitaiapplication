import { prisma } from "@/lib/prisma";
import { notifyApplicant } from "@/lib/notifications";
import { queueEmail, appUrl } from "@/lib/email";
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_ORDER } from "@/lib/applicationStatus";
import type { ApplicationStatus } from "@prisma/client";

// Changes a candidate's status. Every change is recorded with a timestamp in
// CandidateStatusChange. For NOT_MOVING_FORWARD on an applied candidate, the
// recruiter's (editable) note is posted to the applicant's message thread and
// queued as an email, so nobody is left in the "black hole".
export async function applyStatusChange(input: {
  candidateId: string;
  companyId: string;
  status: string;
  message?: string;
  actor: { id: string; name: string };
}): Promise<{ statusToken: string }> {
  const candidate = await prisma.candidate.findFirst({
    where: { id: input.candidateId, job: { companyId: input.companyId } },
    include: { job: { select: { title: true, company: { select: { name: true } } } } },
  });
  if (!candidate) throw new Error("Candidate not found");

  if (!APPLICATION_STATUS_ORDER.includes(input.status as ApplicationStatus)) {
    throw new Error("Invalid status");
  }
  const status = input.status as ApplicationStatus;
  if (status === candidate.status) return { statusToken: candidate.statusToken };

  const now = new Date();
  await prisma.$transaction([
    prisma.candidate.update({
      where: { id: candidate.id },
      data: { status, statusUpdatedAt: now },
    }),
    prisma.candidateStatusChange.create({
      data: {
        candidateId: candidate.id,
        fromStatus: candidate.status,
        toStatus: status,
        changedById: input.actor.id,
        changedByName: input.actor.name,
        changedAt: now,
      },
    }),
  ]);

  // Everything below is applicant-facing, so only for people who actually
  // applied — never for CVs a recruiter sourced and uploaded themselves.
  if (candidate.source !== "APPLIED") return { statusToken: candidate.statusToken };

  const label = APPLICATION_STATUS_LABELS[status] ?? status;
  const statusLink = appUrl(`/applications/${candidate.statusToken}`);
  const message = input.message?.trim() ?? "";

  if (status === "NOT_MOVING_FORWARD") {
    if (message) {
      await prisma.message.create({
        data: { candidateId: candidate.id, sender: "RECRUITER", senderName: input.actor.name, body: message },
      });
      if (candidate.email) {
        await queueEmail({
          to: candidate.email,
          subject: `Your application for ${candidate.job.title} at ${candidate.job.company.name}`,
          body: `${message}\n\n—\nYou can view your application and reply here: ${statusLink}`,
          kind: "NOT_MOVING_FORWARD",
          candidateId: candidate.id,
        });
      }
    }
  } else if (candidate.email) {
    await queueEmail({
      to: candidate.email,
      subject: `Update on your ${candidate.job.title} application`,
      body:
        `Hi ${candidate.name.split(/\s+/)[0]},\n\n` +
        `Your application for ${candidate.job.title} at ${candidate.job.company.name} is now: ${label}.\n\n` +
        `Track it any time: ${statusLink}`,
      kind: "STATUS_CHANGED",
      candidateId: candidate.id,
    });
  }

  if (candidate.applicantId) {
    await notifyApplicant(
      candidate.applicantId,
      "STATUS_CHANGED",
      "Application status updated",
      `Your application for ${candidate.job.title} is now "${label}"`,
      `/my/${candidate.id}`
    );
  }

  return { statusToken: candidate.statusToken };
}
