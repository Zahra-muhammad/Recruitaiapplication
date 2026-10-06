"use server";

import { revalidatePath } from "next/cache";
import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";

export async function toggleSavedJob(jobId: string): Promise<{ saved: boolean }> {
  const session = await applicantAuth();
  const user = session?.user as { id: string } | undefined;
  if (!user) throw new Error("Sign in to save jobs.");

  const existing = await prisma.savedJob.findUnique({
    where: { applicantId_jobId: { applicantId: user.id, jobId } },
  });

  if (existing) {
    await prisma.savedJob.delete({ where: { id: existing.id } });
    revalidatePath("/my");
    return { saved: false };
  }

  await prisma.savedJob.create({ data: { applicantId: user.id, jobId } });
  revalidatePath("/my");
  return { saved: true };
}
