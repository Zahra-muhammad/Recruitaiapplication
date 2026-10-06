"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyApplicant } from "@/lib/notifications";
import { jobMatchesSavedSearch } from "@/lib/savedSearchMatch";
import { parseSalaryFields } from "@/lib/salary";
import type { JobStatus, Seniority, Stage } from "@prisma/client";

const STAGES: Stage[] = ["pre_product", "early_users", "scaling"];
const JOB_STATUSES: JobStatus[] = ["OPEN", "CLOSED"];
const SENIORITIES: Seniority[] = ["ENTRY", "MID", "SENIOR", "LEAD", "EXECUTIVE"];

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
