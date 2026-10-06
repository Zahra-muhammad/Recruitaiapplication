import { prisma } from "@/lib/prisma";
import ApplicantSignupForm, { type SignupPrefill } from "@/components/ApplicantSignupForm";

export default async function ApplicantSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  // Coming from "Save your info to apply faster next time?" — prefill from
  // that application. Only unclaimed applications qualify.
  let prefill: SignupPrefill | undefined;
  if (from) {
    const candidate = await prisma.candidate.findUnique({
      where: { statusToken: from },
      select: { name: true, email: true, phone: true, source: true, applicantId: true },
    });
    if (candidate && candidate.source === "APPLIED" && !candidate.applicantId && candidate.email) {
      prefill = { name: candidate.name, email: candidate.email, phone: candidate.phone ?? "", fromToken: from };
    }
  }

  return <ApplicantSignupForm prefill={prefill} />;
}
