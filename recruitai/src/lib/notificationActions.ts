"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";

export async function markCompanyNotificationsRead() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  await prisma.notification.updateMany({
    where: { companyId: session.user.companyId, read: false },
    data: { read: true },
  });

  revalidatePath("/dashboard");
}

export async function markApplicantNotificationsRead() {
  const session = await applicantAuth();
  const user = session?.user as { id: string } | undefined;
  if (!user) throw new Error("Not authenticated");

  await prisma.notification.updateMany({
    where: { applicantId: user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/my");
}
