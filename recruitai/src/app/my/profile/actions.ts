"use server";

import { revalidatePath } from "next/cache";
import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";
import { isCvFile, storeAndParseApplicantCv, parseCvText, CvReadError } from "@/lib/cvIntake";
import { extractCvProfile } from "@/lib/cvProfile";
import { AiCallError } from "@/lib/ai/claude";
import { cityByKey, cityLabel } from "@/lib/cities";
import {
  missingProfileParts,
  parseEducations,
  parseExperiences,
  type EducationInput,
  type ExperienceInput,
} from "@/lib/applicantProfile";
import type { NoticePeriod, RemotePreference, Seniority, WorkAuthorization } from "@prisma/client";

const VALID_SENIORITIES: Seniority[] = ["ENTRY", "MID", "SENIOR", "LEAD", "EXECUTIVE"];
const VALID_REMOTE_PREFS: RemotePreference[] = ["REMOTE_ONLY", "HYBRID", "ON_SITE", "FLEXIBLE"];
const VALID_NOTICE_PERIODS: NoticePeriod[] = ["IMMEDIATE", "TWO_WEEKS", "ONE_MONTH", "MORE_THAN_ONE_MONTH"];
const VALID_WORK_AUTH: WorkAuthorization[] = ["AUTHORIZED", "REQUIRES_SPONSORSHIP", "PREFER_NOT_TO_SAY"];

const pick = <T extends string>(valid: T[], raw: string): T | null => (valid.includes(raw as T) ? (raw as T) : null);

export type ProfileSaveResult = { ok: true } | { error: string };

async function currentApplicantId(): Promise<string | null> {
  const session = await applicantAuth();
  return (session?.user as { id: string } | undefined)?.id ?? null;
}

// Saves the whole profile. Every section is required except location and
// the optional extras; problems come back as a message (thrown messages are
// hidden in production).
export async function updateProfile(formData: FormData): Promise<ProfileSaveResult> {
  const applicantId = await currentApplicantId();
  if (!applicantId) return { error: "Please sign in again." };

  const text = (key: string, max = 300) => String(formData.get(key) || "").trim().slice(0, max);
  const name = text("name", 120);
  const headline = text("headline", 160);
  const about = text("about", 3000);
  const skills = text("skills", 1000);
  const languages = text("languages", 300);
  const cityKey = text("city", 60);
  const city = cityByKey(cityKey);
  const openToWork = formData.get("openToWork") === "on";

  const exp = parseExperiences(String(formData.get("experiences") || "[]"));
  if ("error" in exp) return { error: exp.error };
  const edu = parseEducations(String(formData.get("educations") || "[]"));
  if ("error" in edu) return { error: edu.error };

  const missing = missingProfileParts({ name, headline, about, skills, experiences: exp.rows, educations: edu.rows });
  if (missing.length > 0) return { error: `Please complete: ${missing.join(", ")}.` };

  const yearsRaw = parseInt(text("yearsOfExperience", 3), 10);

  const data = {
    name,
    phone: text("phone", 40) || null,
    headline,
    about,
    skills,
    languages: languages || null,
    city: city?.key ?? null,
    // Location is optional; the label follows the chosen city.
    location: city ? cityLabel(city) : null,
    openToWork,
    linkedinUrl: text("linkedinUrl") || null,
    portfolioUrl: text("portfolioUrl") || null,
    seniority: pick(VALID_SENIORITIES, text("seniority")),
    desiredTitle: text("desiredTitle", 120) || null,
    yearsOfExperience: Number.isFinite(yearsRaw) && yearsRaw >= 0 && yearsRaw < 70 ? yearsRaw : null,
    workAuthorization: pick(VALID_WORK_AUTH, text("workAuthorization")),
    remotePreference: pick(VALID_REMOTE_PREFS, text("remotePreference")),
    noticePeriod: pick(VALID_NOTICE_PERIODS, text("noticePeriod")),
    salaryExpectation: text("salaryExpectation", 80) || null,
    savedCoverNote: text("savedCoverNote", 3000) || null,
    profileUpdatedAt: new Date(),
  };

  let cvUpdate: { savedCvFileUrl: string; savedCvText: string } | null = null;
  const cv = formData.get("cv");
  if (cv instanceof File && cv.size > 0) {
    if (!isCvFile(cv)) return { error: "CV must be a PDF or Word (.docx) file." };
    try {
      const { storedPath, extractedText } = await storeAndParseApplicantCv(applicantId, cv);
      cvUpdate = { savedCvFileUrl: storedPath, savedCvText: extractedText };
    } catch (err) {
      return { error: err instanceof CvReadError ? err.message : "Your CV couldn't be saved — please try again." };
    }
  }

  await prisma.$transaction([
    prisma.applicant.update({ where: { id: applicantId }, data: { ...data, ...cvUpdate } }),
    prisma.applicantExperience.deleteMany({ where: { applicantId } }),
    prisma.applicantExperience.createMany({
      data: exp.rows.map((r, i) => ({
        applicantId,
        title: r.title,
        company: r.company,
        location: r.location || null,
        startDate: r.startDate,
        endDate: r.endDate || null,
        description: r.description,
        sortOrder: i,
      })),
    }),
    prisma.applicantEducation.deleteMany({ where: { applicantId } }),
    prisma.applicantEducation.createMany({
      data: edu.rows.map((r, i) => ({
        applicantId,
        school: r.school,
        qualification: r.qualification,
        field: r.field || null,
        startYear: r.startYear ? Number(r.startYear) : null,
        endYear: r.endYear ? Number(r.endYear) : null,
        sortOrder: i,
      })),
    }),
  ]);

  revalidatePath("/my/profile");
  return { ok: true };
}

export interface ProfileDraft {
  headline: string;
  skills: string;
  languages: string;
  experiences: ExperienceInput[];
  educations: EducationInput[];
}

// "Fill from my CV": reads the uploaded (or saved) CV with the same AI
// extractor the scorer uses and returns entries for the candidate to review
// in the editor. Nothing is saved until they press Save.
export async function draftProfileFromCv(formData: FormData): Promise<{ draft: ProfileDraft } | { error: string }> {
  const applicantId = await currentApplicantId();
  if (!applicantId) return { error: "Please sign in again." };

  let cvText: string;
  const cv = formData.get("cv");
  try {
    if (cv instanceof File && cv.size > 0) {
      if (!isCvFile(cv)) return { error: "CV must be a PDF or Word (.docx) file." };
      cvText = await parseCvText(cv);
    } else {
      const saved = await prisma.applicant.findUnique({ where: { id: applicantId }, select: { savedCvText: true } });
      if (!saved?.savedCvText) return { error: "Choose a CV file first." };
      cvText = saved.savedCvText;
    }
    const p = await extractCvProfile(cvText);
    const skills = [...new Set([...p.skillsListed, ...p.roles.flatMap((r) => r.skillsUsed)].map((s) => s.trim()).filter(Boolean))];
    return {
      draft: {
        headline: p.headline ?? "",
        skills: skills.join(", "),
        languages: p.languages.join(", "),
        experiences: p.roles
          .filter((r) => !r.isCareerBreak && r.startDate)
          .map((r) => ({
            title: r.title,
            company: r.organisation ?? "",
            location: "",
            startDate: (r.startDate ?? "").slice(0, 7),
            endDate: !r.endDate || /present/i.test(r.endDate) ? "" : r.endDate.slice(0, 7),
            description: r.summary,
          })),
        educations: p.education.map((e) => ({
          school: e.institution ?? "",
          qualification: e.qualification,
          field: "",
          startYear: "",
          endYear: e.year?.match(/(19|20)\d{2}/)?.[0] ?? "",
        })),
      },
    };
  } catch (err) {
    console.error("[profile-from-cv] failed", err);
    if (err instanceof CvReadError || err instanceof AiCallError) return { error: err.message };
    return { error: "Couldn't read your CV right now — you can still fill the profile in by hand." };
  }
}
