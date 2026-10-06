"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { applicantAuth } from "@/applicantAuth";
import { applicantFit, type QualificationResult } from "@/lib/scoring";
import { takeFitCheck } from "@/lib/fitCheckLimit";
import { isCvFile, storeAndParseCv, parseCvText, CvReadError } from "@/lib/cvIntake";
import { scoreInBackground, scoreCvForJob, isScoreCached } from "@/lib/scoringRun";
import { notifyCompany } from "@/lib/notifications";
import { queueEmail, appUrl } from "@/lib/email";
import { newStatusToken } from "@/lib/statusToken";
import { publicJobWhere } from "@/lib/jobVerification";
import { findLikelyDuplicate } from "@/lib/duplicateDetection";

async function findOpenJob(jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, ...publicJobWhere() },
    include: { company: { select: { name: true } } },
  });
  if (!job) throw new Error("This job is no longer accepting applications.");
  return job;
}

type OpenJob = Awaited<ReturnType<typeof findOpenJob>>;

async function getSignedInApplicantId(): Promise<string | null> {
  const session = await applicantAuth();
  return (session?.user as { id: string } | undefined)?.id ?? null;
}

// One application per person per job — by account if signed in, else by email.
async function assertNotAlreadyApplied(jobId: string, email: string, applicantId: string | null) {
  const existing = await prisma.candidate.findFirst({
    where: {
      jobId,
      source: "APPLIED",
      OR: [{ email }, ...(applicantId ? [{ applicantId }] : [])],
    },
    select: { id: true },
  });
  if (existing) {
    throw new Error(
      "You've already applied to this role. Check your email for your status link, or use \"Check status\"."
    );
  }
}

// Shared by the regular apply form and one-click profile apply: creates the
// Candidate (scored by AI after the response is sent), notifies the company, and queues the applicant's
// confirmation email with their private status link. Returns the token.
async function createApplication(
  job: OpenJob,
  input: {
    name: string;
    email: string;
    phone: string | null;
    coverNote: string | null;
    qualifications: string | null;
    cvFileUrl: string;
    extractedText: string;
    applicantId: string | null;
  }
): Promise<string> {
  const duplicate = await findLikelyDuplicate(job.companyId, input.extractedText);
  const statusToken = newStatusToken();

  const candidate = await prisma.candidate.create({
    data: {
      jobId: job.id,
      statusToken,
      name: input.name,
      email: input.email,
      phone: input.phone,
      coverNote: input.coverNote,
      qualifications: input.qualifications,
      cvFileUrl: input.cvFileUrl,
      extractedText: input.extractedText,
      source: "APPLIED",
      applicantId: input.applicantId,
      duplicateOfId: duplicate?.candidateId ?? null,
      duplicateSimilarity: duplicate?.similarity ?? null,
    },
  });

  await notifyCompany(
    job.companyId,
    "NEW_APPLICANT",
    "New applicant",
    `${input.name} applied to ${job.title}`,
    `/dashboard/${job.id}`
  );

  scoreInBackground([candidate.id]);

  await queueEmail({
    to: input.email,
    subject: `We received your application for ${job.title}`,
    body:
      `Hi ${input.name.split(/\s+/)[0]},\n\n` +
      `Your application for ${job.title} at ${job.company.name} is in. ` +
      `You can check where it stands — and read or reply to any messages from the team — here:\n\n` +
      `${appUrl(`/applications/${statusToken}`)}\n\n` +
      `Keep this link private; anyone with it can see your application status.`,
    kind: "APPLICATION_RECEIVED",
    candidateId: candidate.id,
  });

  return statusToken;
}

export async function applyToJob(jobId: string, formData: FormData) {
  const job = await findOpenJob(jobId);

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const coverNote = String(formData.get("coverNote") || "").trim();
  const qualifications = String(formData.get("qualifications") || "").trim();
  const cv = formData.get("cv");
  const useSavedCv = String(formData.get("useSavedCv") || "") === "true";

  if (!name) throw new Error("Full name is required.");
  if (!email) throw new Error("Email is required.");

  // Applying itself never requires an account — this session lookup only
  // links the application to an account if one happens to be signed in.
  const applicantId = await getSignedInApplicantId();
  await assertNotAlreadyApplied(jobId, email, applicantId);

  let storedPath: string;
  let extractedText: string;

  if (useSavedCv) {
    if (!applicantId) throw new Error("Sign in to use a saved CV.");
    const applicant = await prisma.applicant.findUnique({ where: { id: applicantId } });
    if (!applicant?.savedCvFileUrl || !applicant.savedCvText) {
      throw new Error("No saved CV found — please upload one.");
    }
    storedPath = applicant.savedCvFileUrl;
    extractedText = applicant.savedCvText;
  } else {
    if (!(cv instanceof File) || cv.size === 0) {
      throw new Error("A CV (PDF or Word) is required.");
    }
    if (!isCvFile(cv)) {
      throw new Error("CV must be a PDF or Word (.docx) file.");
    }
    const parsed = await storeAndParseCv(jobId, cv);
    storedPath = parsed.storedPath;
    extractedText = parsed.extractedText;
  }

  const statusToken = await createApplication(job, {
    name,
    email,
    phone: phone || null,
    coverNote: coverNote || null,
    qualifications: qualifications || null,
    cvFileUrl: storedPath,
    extractedText,
    applicantId,
  });

  redirect(`/jobs/${jobId}/applied?t=${statusToken}`);
}

// The fit check behind both "Check my fit" and one-click apply: the same AI
// score the recruiter will see (stored, so applying afterwards reuses it).
// If the AI can't run, the applicant is let through rather than blocked —
// their CV is still scored for the recruiter after they apply.
async function fitFor(cvText: string, job: OpenJob): Promise<QualificationResult> {
  try {
    if (!(await isScoreCached(cvText, job)) && !(await takeFitCheck())) {
      return { matched: [], missing: [], qualified: false, tips: [], error: "You've checked several CVs in the last hour. Please try again a bit later." };
    }
    return applicantFit((await scoreCvForJob(cvText, job)).result);
  } catch (err) {
    console.error("[fit-check] failed", err);
    return {
      matched: [],
      missing: [],
      qualified: true,
      tips: ["We couldn't run the automatic check right now — you can still apply, and the team will review your CV."],
    };
  }
}

const fail = (error: string): QualificationResult => ({ matched: [], missing: [], qualified: false, tips: [], error });

// One-click apply for signed-in applicants with a saved profile + CV. Runs
// the same fit check as "Check my fit" — if they don't pass, nothing is
// submitted and they get the same matched/missing feedback instead.
export async function quickApplyWithProfile(jobId: string): Promise<QualificationResult> {
  const job = await findOpenJob(jobId);

  const applicantId = await getSignedInApplicantId();
  if (!applicantId) return fail("Sign in to apply with your profile.");
  const applicant = await prisma.applicant.findUnique({ where: { id: applicantId } });
  if (!applicant?.savedCvFileUrl || !applicant.savedCvText) {
    return fail("Add a CV to your profile first.");
  }

  try {
    await assertNotAlreadyApplied(jobId, applicant.email, applicantId);
  } catch (err) {
    return fail((err as Error).message);
  }

  const fit = await fitFor(applicant.savedCvText, job);
  if (fit.error || !fit.qualified) return fit;

  const statusToken = await createApplication(job, {
    name: applicant.name,
    email: applicant.email,
    phone: applicant.phone,
    coverNote: applicant.savedCoverNote,
    qualifications: null,
    cvFileUrl: applicant.savedCvFileUrl,
    extractedText: applicant.savedCvText,
    applicantId,
  });

  redirect(`/jobs/${jobId}/applied?t=${statusToken}`);
}

// Applicant self-check — parses the CV in memory only (or reuses a saved CV's
// already-extracted text). No Candidate record is created and no file is
// stored; only clicking "Submit application" actually applies. Returns
// matched/missing requirements and tips — never the score or verdict, which
// stay recruiter-only. Problems come back as `error` (thrown messages are
// hidden in production).
export async function checkFit(jobId: string, formData: FormData): Promise<QualificationResult> {
  const job = await findOpenJob(jobId);

  const useSavedCv = String(formData.get("useSavedCv") || "") === "true";
  let extractedText: string;

  if (useSavedCv) {
    const applicantId = await getSignedInApplicantId();
    if (!applicantId) return fail("Sign in to use a saved CV.");
    const applicant = await prisma.applicant.findUnique({ where: { id: applicantId } });
    if (!applicant?.savedCvText) return fail("No saved CV found — please upload one.");
    extractedText = applicant.savedCvText;
  } else {
    const cv = formData.get("cv");
    if (!(cv instanceof File) || cv.size === 0) return fail("Please attach your CV as a PDF or Word file.");
    if (!isCvFile(cv)) return fail("CV must be a PDF or Word (.docx) file.");
    try {
      extractedText = await parseCvText(cv);
    } catch (err) {
      return fail(err instanceof CvReadError ? err.message : "We couldn't read this file. Please try another copy of your CV.");
    }
  }

  return fitFor(extractedText, job);
}
