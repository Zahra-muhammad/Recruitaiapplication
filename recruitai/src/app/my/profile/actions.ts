"use server";

import { revalidatePath } from "next/cache";
import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";
import { isCvFile, storeAndParseApplicantCv } from "@/lib/cvIntake";
import type { NoticePeriod, RemotePreference, Seniority, WorkAuthorization } from "@prisma/client";

const VALID_SENIORITIES: Seniority[] = ["ENTRY", "MID", "SENIOR", "LEAD", "EXECUTIVE"];
const VALID_REMOTE_PREFS: RemotePreference[] = ["REMOTE_ONLY", "HYBRID", "ON_SITE", "FLEXIBLE"];
const VALID_NOTICE_PERIODS: NoticePeriod[] = [
  "IMMEDIATE",
  "TWO_WEEKS",
  "ONE_MONTH",
  "MORE_THAN_ONE_MONTH",
];
const VALID_WORK_AUTH: WorkAuthorization[] = [
  "AUTHORIZED",
  "REQUIRES_SPONSORSHIP",
  "PREFER_NOT_TO_SAY",
];

export async function updateProfile(formData: FormData) {
  const session = await applicantAuth();
  const user = session?.user as { id: string } | undefined;
  if (!user) throw new Error("Not authenticated");

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const headline = String(formData.get("headline") || "").trim();
  const skills = String(formData.get("skills") || "").trim();
  const linkedinUrl = String(formData.get("linkedinUrl") || "").trim();
  const portfolioUrl = String(formData.get("portfolioUrl") || "").trim();
  const seniorityRaw = String(formData.get("seniority") || "");
  const location = String(formData.get("location") || "").trim();
  const desiredTitle = String(formData.get("desiredTitle") || "").trim();
  const yearsOfExperienceRaw = String(formData.get("yearsOfExperience") || "");
  const workAuthorizationRaw = String(formData.get("workAuthorization") || "");
  const remotePreferenceRaw = String(formData.get("remotePreference") || "");
  const noticePeriodRaw = String(formData.get("noticePeriod") || "");
  const salaryExpectation = String(formData.get("salaryExpectation") || "").trim();
  const savedCoverNote = String(formData.get("savedCoverNote") || "").trim();
  const cv = formData.get("cv");

  if (!name) throw new Error("Name is required.");

  const seniority = VALID_SENIORITIES.includes(seniorityRaw as Seniority)
    ? (seniorityRaw as Seniority)
    : null;
  const remotePreference = VALID_REMOTE_PREFS.includes(remotePreferenceRaw as RemotePreference)
    ? (remotePreferenceRaw as RemotePreference)
    : null;
  const noticePeriod = VALID_NOTICE_PERIODS.includes(noticePeriodRaw as NoticePeriod)
    ? (noticePeriodRaw as NoticePeriod)
    : null;
  const workAuthorization = VALID_WORK_AUTH.includes(workAuthorizationRaw as WorkAuthorization)
    ? (workAuthorizationRaw as WorkAuthorization)
    : null;
  const parsedYears = yearsOfExperienceRaw ? parseInt(yearsOfExperienceRaw, 10) : NaN;
  const yearsOfExperience = Number.isFinite(parsedYears) && parsedYears >= 0 ? parsedYears : null;

  const data: {
    name: string;
    phone: string | null;
    headline: string | null;
    skills: string | null;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    seniority: Seniority | null;
    location: string | null;
    desiredTitle: string | null;
    yearsOfExperience: number | null;
    workAuthorization: WorkAuthorization | null;
    remotePreference: RemotePreference | null;
    noticePeriod: NoticePeriod | null;
    salaryExpectation: string | null;
    savedCoverNote: string | null;
    savedCvFileUrl?: string;
    savedCvText?: string;
  } = {
    name,
    phone: phone || null,
    headline: headline || null,
    skills: skills || null,
    linkedinUrl: linkedinUrl || null,
    portfolioUrl: portfolioUrl || null,
    seniority,
    location: location || null,
    desiredTitle: desiredTitle || null,
    yearsOfExperience,
    workAuthorization,
    remotePreference,
    noticePeriod,
    salaryExpectation: salaryExpectation || null,
    savedCoverNote: savedCoverNote || null,
  };

  if (cv instanceof File && cv.size > 0) {
    if (!isCvFile(cv)) throw new Error("CV must be a PDF or Word (.docx) file.");
    const { storedPath, extractedText } = await storeAndParseApplicantCv(user.id, cv);
    data.savedCvFileUrl = storedPath;
    data.savedCvText = extractedText;
  }

  await prisma.applicant.update({ where: { id: user.id }, data });

  revalidatePath("/my/profile");
}
