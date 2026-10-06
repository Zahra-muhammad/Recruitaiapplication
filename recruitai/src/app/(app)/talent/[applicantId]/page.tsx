import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProfileView from "@/components/ProfileView";
import VerdictBadge from "@/components/VerdictBadge";
import { InviteButton } from "@/components/TalentActions";
import { missingProfileParts, profileAsCvText } from "@/lib/applicantProfile";
import { cachedScore } from "@/lib/scoringRun";
import { inviteToApply } from "../actions";

// A recruiter's view of an open-to-work candidate: profile without contact
// details, plus how they fit the selected job (if it's been scored).
export default async function TalentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ applicantId: string }>;
  searchParams: Promise<{ job?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const { applicantId } = await params;
  const { job: jobId } = await searchParams;

  const profile = await prisma.applicant.findUnique({
    where: { id: applicantId },
    include: { experiences: { orderBy: { sortOrder: "asc" } }, educations: { orderBy: { sortOrder: "asc" } } },
  });
  // Private profiles don't exist as far as recruiters are concerned.
  if (!profile || !profile.openToWork || missingProfileParts(profile).length > 0) notFound();

  const job = jobId ? await prisma.job.findFirst({ where: { id: jobId, companyId: session.user.companyId } }) : null;
  const score = job ? await cachedScore(profileAsCvText(profile), job) : null;
  const [invite, application] = job
    ? await Promise.all([
        prisma.jobInvite.findUnique({ where: { jobId_applicantId: { jobId: job.id, applicantId } } }),
        prisma.candidate.findFirst({ where: { jobId: job.id, applicantId }, select: { id: true } }),
      ])
    : [null, null];

  return (
    <div className="max-w-3xl space-y-4">
      <Link
        href={job ? `/talent?job=${job.id}` : "/talent"}
        className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        ← Back to talent search
      </Link>

      {job && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Fit for {job.title}</p>
              {score ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-semibold text-zinc-900">
                    {score.totalScore}
                    <span className="text-sm text-zinc-400">/100</span>
                  </span>
                  <VerdictBadge verdict={score.verdict} />
                </div>
              ) : (
                <p className="text-sm text-zinc-500 mt-1">Not scored yet — score them from the talent search list.</p>
              )}
            </div>
            {application ? (
              <Link href={`/dashboard/${job.id}/candidates/${application.id}`} className="text-sm font-medium text-indigo-700 hover:underline">
                View application →
              </Link>
            ) : (
              <InviteButton invited={!!invite} applied={false} inviteAction={inviteToApply.bind(null, job.id, applicantId)} />
            )}
          </div>
          {score && (
            <>
              <p className="text-sm text-zinc-700 mt-3">{score.summary}</p>
              <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-emerald-700 mb-1">Must-haves shown</p>
                  <ul className="list-disc list-inside text-zinc-700 space-y-0.5">
                    {score.details.mustHaves.filter((m) => m.demonstrated).map((m) => (
                      <li key={m.requirement}>{m.requirement}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-700 mb-1">Must-haves missing</p>
                  <ul className="list-disc list-inside text-zinc-700 space-y-0.5">
                    {score.details.mustHaves.filter((m) => !m.demonstrated).map((m) => (
                      <li key={m.requirement}>{m.requirement}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <ProfileView profile={profile} audience="recruiter" />
    </div>
  );
}
