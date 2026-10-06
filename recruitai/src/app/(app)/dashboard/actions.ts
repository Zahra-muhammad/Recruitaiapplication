"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyApplicant } from "@/lib/notifications";
import { jobMatchesSavedSearch } from "@/lib/savedSearchMatch";
import { parseSalaryFields } from "@/lib/salary";
import { cvFormat, extractCvText, CvReadError } from "@/lib/cvIntake";
import { extractJobDraft, type JobDraft } from "@/lib/jobImport";
import { AiCallError } from "@/lib/ai/claude";
import type { JobStatus, Seniority, Stage } from "@prisma/client";

const STAGES: Stage[] = ["pre_product", "early_users", "scaling"];
const JOB_STATUSES: JobStatus[] = ["OPEN", "CLOSED"];
const SENIORITIES: Seniority[] = ["ENTRY", "MID", "SENIOR", "LEAD", "EXECUTIVE"];

const MAX_JD_BYTES = 4 * 1024 * 1024;

// Reads an uploaded job description and returns form values for the
// recruiter to review — nothing is saved. Errors come back as a message
// (thrown messages are hidden in production).
export async function importJobDescription(
  formData: FormData
): Promise<{ draft: JobDraft } | { error: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Please sign in again." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF or Word file first." };
  if (file.size > MAX_JD_BYTES) return { error: "That file is over 4MB." };
  const format = cvFormat(file);
  if (!format) return { error: "Upload a PDF or Word (.docx) file." };

  try {
    const text = await extractCvText(Buffer.from(await file.arrayBuffer()), format, "job description");
    return { draft: await extractJobDraft(text) };
  } catch (err) {
    console.error("[job-import] failed", err);
    if (err instanceof CvReadError || err instanceof AiCallError) return { error: err.message };
    return { error: "Couldn't read this job description. Please try again, or fill in the form by hand." };
  }
}

export async function createJob(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const seniority = String(formData.get("seniority") || "MID") as Seniority;
  const stage = String(formData.get("stage") || "pre_product") as Stage;
  const keySkills = String(formData.get("keySkills") || "").trim();
  const stageContext = String(formData.get("stageContext") || "").trim();
  const whatTheyOwnFirst = String(formData.get("whatTheyOwnFirst") || "").trim();

  if (!title || !description || !keySkills || !whatTheyOwnFirst) {
    throw new Error("Missing required fields");
  }
  const salary = parseSalaryFields(formData);
  if (!STAGES.includes(stage)) {
    throw new Error("Invalid stage");
  }
  if (!SENIORITIES.includes(seniority)) {
    throw new Error("Invalid seniority");
  }

  const job = await prisma.job.create({
    data: {
      title,
      description,
      location: location || "Remote",
      seniority,
      stage,
      keySkills,
      stageContext: stageContext || stage,
      whatTheyOwnFirst,
      ...salary,
      companyId: session.user.companyId,
      createdBy: session.user.id,
    },
  });

  const savedSearches = await prisma.savedSearch.findMany();
  const matchingApplicantIds = savedSearches
    .filter((s) => jobMatchesSavedSearch(job, s))
    .map((s) => s.applicantId);

  for (const applicantId of new Set(matchingApplicantIds)) {
    await notifyApplicant(
      applicantId,
      "JOB_ALERT",
      "New job matches your saved search",
      `${job.title} was just posted`,
      `/jobs/${job.id}`
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  redirect(`/dashboard/${job.id}`);
}

export async function setJobStatus(jobId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const status = String(formData.get("status") || "") as JobStatus;
  if (!JOB_STATUSES.includes(status)) throw new Error("Invalid status");

  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId: session.user.companyId },
  });
  if (!job) throw new Error("Job not found");

  // Reopening counts as confirming the role is live — otherwise an
  // auto-closed job would be re-closed on the next page load.
  await prisma.job.update({
    where: { id: jobId },
    data:
      status === "OPEN"
        ? { status, lastVerifiedActive: new Date(), autoClosedAt: null }
        : { status },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
}

// For postings created before salary became required.
export async function setJobSalary(jobId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId: session.user.companyId },
  });
  if (!job) throw new Error("Job not found");

  await prisma.job.update({ where: { id: jobId }, data: parseSalaryFields(formData) });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
}

// "Still hiring for this role? Confirm it's still open."
export async function confirmJobStillOpen(jobId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId: session.user.companyId, status: "OPEN" },
  });
  if (!job) throw new Error("Job not found");

  await prisma.job.update({ where: { id: jobId }, data: { lastVerifiedActive: new Date() } });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${jobId}`);
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
}
