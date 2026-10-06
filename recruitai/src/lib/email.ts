import { prisma } from "@/lib/prisma";

// Absolute base URL for links inside emails.
export function appUrl(path: string): string {
  const base = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

// No email provider is configured yet, so every applicant-facing email is
// written to the OutboundEmail outbox as QUEUED. Wiring up a provider later
// means draining QUEUED rows — callers don't need to change.
export async function queueEmail(input: {
  to: string;
  subject: string;
  body: string;
  kind: string;
  candidateId?: string;
}) {
  await prisma.outboundEmail.create({ data: input });

  if (process.env.NODE_ENV !== "production") {
    console.log(`[email queued] to=${input.to} kind=${input.kind}\n  ${input.subject}\n${input.body}\n`);
  }
}
