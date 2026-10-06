import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
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

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  headline: z.string().optional(),
  skills: z.string().optional(),
  linkedinUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  seniority: z.string().optional(),
  location: z.string().optional(),
  desiredTitle: z.string().optional(),
  yearsOfExperience: z.string().optional(),
  workAuthorization: z.string().optional(),
  remotePreference: z.string().optional(),
  noticePeriod: z.string().optional(),
  salaryExpectation: z.string().optional(),
  fromToken: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const {
    name,
    email,
    password,
    phone,
    headline,
    skills,
    linkedinUrl,
    portfolioUrl,
    seniority,
    location,
    desiredTitle,
    yearsOfExperience,
    workAuthorization,
    remotePreference,
    noticePeriod,
    salaryExpectation,
    fromToken,
  } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.applicant.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const validSeniority = VALID_SENIORITIES.includes(seniority as Seniority)
    ? (seniority as Seniority)
    : null;
  const validRemotePreference = VALID_REMOTE_PREFS.includes(remotePreference as RemotePreference)
    ? (remotePreference as RemotePreference)
    : null;
  const validNoticePeriod = VALID_NOTICE_PERIODS.includes(noticePeriod as NoticePeriod)
    ? (noticePeriod as NoticePeriod)
    : null;
  const validWorkAuth = VALID_WORK_AUTH.includes(workAuthorization as WorkAuthorization)
    ? (workAuthorization as WorkAuthorization)
    : null;
  const parsedYears = yearsOfExperience ? parseInt(yearsOfExperience, 10) : NaN;
  const validYears = Number.isFinite(parsedYears) && parsedYears >= 0 ? parsedYears : null;

  const applicant = await prisma.applicant.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      phone: phone || null,
      headline: headline || null,
      skills: skills || null,
      linkedinUrl: linkedinUrl || null,
      portfolioUrl: portfolioUrl || null,
      seniority: validSeniority,
      location: location || null,
      desiredTitle: desiredTitle || null,
      yearsOfExperience: validYears,
      workAuthorization: validWorkAuth,
      remotePreference: validRemotePreference,
      noticePeriod: validNoticePeriod,
      salaryExpectation: salaryExpectation || null,
    },
  });

  // "Save your info" after applying without an account: adopt that
  // application and reuse its CV as the profile CV. Requires the private
  // status token AND a matching email, so nobody can claim someone else's.
  if (fromToken) {
    const candidate = await prisma.candidate.findUnique({ where: { statusToken: fromToken } });
    if (
      candidate &&
      candidate.source === "APPLIED" &&
      !candidate.applicantId &&
      candidate.email?.toLowerCase() === normalizedEmail
    ) {
      await prisma.$transaction([
        prisma.candidate.update({ where: { id: candidate.id }, data: { applicantId: applicant.id } }),
        prisma.applicant.update({
          where: { id: applicant.id },
          data: {
            savedCvFileUrl: candidate.cvFileUrl,
            savedCvText: candidate.extractedText,
            savedCoverNote: candidate.coverNote,
          },
        }),
      ]);
    }
  }

  return NextResponse.json({ id: applicant.id, email: applicant.email });
}
