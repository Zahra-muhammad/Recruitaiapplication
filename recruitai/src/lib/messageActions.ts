"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";
import { notifyApplicant, notifyCompany } from "@/lib/notifications";
import { queueEmail, appUrl } from "@/lib/email";

const MAX_MESSAGE_LENGTH = 5000;

function readBody(formData: FormData): string {
  const body = String(formData.get("body") || "").trim();
  if (!body) throw new Error("Message can't be empty.");
  if (body.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`);
  }
  return body;
}

export async function sendRecruiterMessage(
  jobId: string,
  candidateId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, job: { companyId: session.user.companyId } },
    include: { job: { select: { title: true, company: { select: { name: true } } } } },
  });
  if (!candidate) throw new Error("Candidate not found");
  // Uploaded CVs never applied, so there's nobody on the other end to read it.
  if (candidate.source !== "APPLIED") throw new Error("Only applicants can be messaged.");

  const body = readBody(formData);
  const senderName = session.user.name ?? "Recruiter";

  await prisma.message.create({
    data: { candidateId, sender: "RECRUITER", senderName, senderUserId: session.user.id, body },
  });

  if (candidate.applicantId) {
    await notifyApplicant(
      candidate.applicantId,
      "NEW_MESSAGE",
      "New message from recruiter",
      `Re: ${candidate.job.title}`,
      `/my/${candidateId}`
    );
  }

  if (candidate.email) {
    await queueEmail({
      to: candidate.email,
      subject: `New message about your ${candidate.job.title} application`,
      body:
        `${senderName} at ${candidate.job.company.name} sent you a message:\n\n` +
        `${body}\n\n—\nReply here: ${appUrl(`/applications/${candidate.statusToken}`)}`,
      kind: "NEW_MESSAGE",
      candidateId,
    });
  }

  revalidatePath(`/dashboard/${jobId}/candidates/${candidateId}`);
  revalidatePath(`/applications/${candidate.statusToken}`);
}

async function createApplicantReply(
  candidate: { id: string; name: string; jobId: string; statusToken: string; job: { title: string; companyId: string } },
  senderName: string,
  body: string
) {
  await prisma.message.create({
    data: { candidateId: candidate.id, sender: "APPLICANT", senderName, body },
  });

  await notifyCompany(
    candidate.job.companyId,
    "NEW_MESSAGE",
    `New message from ${candidate.name}`,
    `Re: ${candidate.job.title}`,
    `/dashboard/${candidate.jobId}/candidates/${candidate.id}`
  );

  revalidatePath(`/dashboard/${candidate.jobId}/candidates/${candidate.id}`);
  revalidatePath(`/applications/${candidate.statusToken}`);
  revalidatePath(`/my/${candidate.id}`);
}

// Signed-in applicant replying from /my/[candidateId].
export async function sendApplicantMessage(candidateId: string, formData: FormData) {
  const session = await applicantAuth();
  const user = session?.user as { id: string; name?: string | null } | undefined;
  if (!user) throw new Error("Not authenticated");

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, applicantId: user.id },
    include: { job: { select: { title: true, companyId: true } } },
  });
  if (!candidate) throw new Error("Application not found");

  await createApplicantReply(candidate, user.name ?? candidate.name, readBody(formData));
}

// Account-free applicant replying from /applications/[token]. The secret
// status token is the credential, same as for viewing the page.
export async function sendApplicantMessageByToken(statusToken: string, formData: FormData) {
  const candidate = await prisma.candidate.findUnique({
    where: { statusToken },
    include: { job: { select: { title: true, companyId: true } } },
  });
  if (!candidate || candidate.source !== "APPLIED") throw new Error("Application not found");

  await createApplicantReply(candidate, candidate.name, readBody(formData));
}
