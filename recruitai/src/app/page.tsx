import { auth } from "@/auth";
import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";
import { publicJobWhere } from "@/lib/jobVerification";
import LandingPage from "@/components/LandingPage";

export default async function Home() {
  const [recruiterSession, applicantSession, openJobsCount, companiesCount, candidatesScored] =
    await Promise.all([
      auth(),
      applicantAuth(),
      prisma.job.count({ where: publicJobWhere() }),
      prisma.company.count(),
      prisma.candidate.count(),
    ]);

  const company = recruiterSession?.user
    ? await prisma.company.findUnique({
        where: { id: recruiterSession.user.companyId },
        select: { name: true },
      })
    : null;

  const applicantUser = applicantSession?.user as { name?: string | null } | undefined;

  return (
    <LandingPage
      recruiter={
        recruiterSession?.user
          ? { name: recruiterSession.user.name ?? "", companyName: company?.name ?? null }
          : null
      }
      applicantName={applicantUser?.name ?? null}
      stats={{ openJobsCount, companiesCount, candidatesScored }}
    />
  );
}
