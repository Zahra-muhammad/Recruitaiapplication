"use server";

import { prisma } from "@/lib/prisma";
import { queueEmail, appUrl } from "@/lib/email";

export interface StatusLookupResult {
  // Only populated outside production, since no email provider is wired up
  // yet — lets the flow be tested end to end locally.
  devLinks?: { jobTitle: string; url: string }[];
}

// Emails the applicant private links to every application under their email.
// The response is identical whether or not the email has applications, so
// this page can't be used to discover where someone has applied.
export async function requestStatusLinks(formData: FormData): Promise<StatusLookupResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Enter the email you applied with.");

  const applications = await prisma.candidate.findMany({
    where: { email, source: "APPLIED" },
    select: {
      id: true,
      statusToken: true,
      job: { select: { title: true, company: { select: { name: true } } } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  if (applications.length === 0) return {};

  const links = applications.map((a) => ({
    jobTitle: `${a.job.title} — ${a.job.company.name}`,
    url: appUrl(`/applications/${a.statusToken}`),
  }));

  await queueEmail({
    to: email,
    subject: "Your application status links",
    body:
      `Here are the private links to track your applications:\n\n` +
      links.map((l) => `• ${l.jobTitle}\n  ${l.url}`).join("\n\n") +
      `\n\nIf you didn't request this, you can ignore this email.`,
    kind: "STATUS_LINKS",
  });

  return process.env.NODE_ENV !== "production" ? { devLinks: links } : {};
}
