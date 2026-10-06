"use server";

import { revalidatePath } from "next/cache";
import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";
import type { Seniority } from "@prisma/client";

const VALID_SENIORITIES: Seniority[] = ["ENTRY", "MID", "SENIOR", "LEAD", "EXECUTIVE"];

export async function createSavedSearch(formData: FormData) {
  const session = await applicantAuth();
  const user = session?.user as { id: string } | undefined;
  if (!user) throw new Error("Not authenticated");

  const label = String(formData.get("label") || "").trim();
  const query = String(formData.get("query") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const seniorityRaw = String(formData.get("seniority") || "");
  const skill = String(formData.get("skill") || "").trim();

  if (!label) throw new Error("Give this search a name.");

  const seniority = VALID_SENIORITIES.includes(seniorityRaw as Seniority)
    ? (seniorityRaw as Seniority)
    : null;

  await prisma.savedSearch.create({
    data: {
      applicantId: user.id,
      label,
      query: query || null,
      location: location || null,
      seniority,
      skill: skill || null,
    },
  });

  revalidatePath("/my/saved-searches");
}

export async function deleteSavedSearch(searchId: string) {
  const session = await applicantAuth();
  const user = session?.user as { id: string } | undefined;
  if (!user) throw new Error("Not authenticated");

  await prisma.savedSearch.deleteMany({ where: { id: searchId, applicantId: user.id } });

  revalidatePath("/my/saved-searches");
}
