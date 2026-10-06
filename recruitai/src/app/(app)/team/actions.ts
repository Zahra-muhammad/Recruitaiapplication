"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { CompanySize } from "@prisma/client";

const VALID_SIZES: CompanySize[] = [
  "SIZE_1_10",
  "SIZE_11_50",
  "SIZE_51_200",
  "SIZE_201_1000",
  "SIZE_1000_PLUS",
];

export async function inviteRecruiter(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Only admins can add recruiters");
  }

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "recruiter") === "admin" ? "admin" : "recruiter";

  if (!name || !email || password.length < 8) {
    throw new Error("Name, email, and an 8+ character password are required");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("A user with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      companyId: session.user.companyId,
    },
  });

  revalidatePath("/team");
}

export async function updateCompanyProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Only admins can edit the company profile");
  }

  const industry = String(formData.get("industry") || "").trim();
  const website = String(formData.get("website") || "").trim();
  const sizeRaw = String(formData.get("size") || "");
  const about = String(formData.get("about") || "").trim();

  const size = VALID_SIZES.includes(sizeRaw as CompanySize) ? (sizeRaw as CompanySize) : null;

  await prisma.company.update({
    where: { id: session.user.companyId },
    data: {
      industry: industry || null,
      website: website || null,
      size,
      about: about || null,
    },
  });

  revalidatePath("/team");
  revalidatePath("/jobs");
}
