import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

export async function notifyCompany(
  companyId: string,
  type: NotificationType,
  title: string,
  body: string,
  link: string
) {
  await prisma.notification.create({ data: { companyId, type, title, body, link } });
}

export async function notifyApplicant(
  applicantId: string,
  type: NotificationType,
  title: string,
  body: string,
  link: string
) {
  await prisma.notification.create({ data: { applicantId, type, title, body, link } });
}
