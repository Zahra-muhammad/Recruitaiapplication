import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import StageBadge from "@/components/StageBadge";
import JobStatusBadge from "@/components/JobStatusBadge";
import SourceTag from "@/components/SourceTag";
import StatTile from "@/components/StatTile";
import HiringFunnelBar from "@/components/HiringFunnelBar";
import SourceBreakdownBar from "@/components/SourceBreakdownBar";
import TrendBarChart from "@/components/TrendBarChart";
import ReverifyJobBanner from "@/components/ReverifyJobBanner";
import { closeStaleJobs, needsReverification } from "@/lib/jobVerification";
import { confirmJobStillOpen } from "./actions";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const companyId = session.user.companyId;
  await closeStaleJobs(companyId);

  const jobs = await prisma.job.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: {
      creator: { select: { name: true } },
      candidates: { include: { evaluation: true } },
    },
  });

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentActivity = await prisma.candidate.findMany({
    where: { job: { companyId } },
    include: { evaluation: true, job: { select: { id: true, title: true } } },
    orderBy: { uploadedAt: "desc" },
    take: 8,
  });

  const allCandidates = jobs.flatMap((j) => j.candidates);
  const scored = allCandidates.filter((c) => c.evaluation);
  const effectiveVerdict = (c: (typeof scored)[number]) =>
    c.evaluation!.manualVerdictOverride ?? c.evaluation!.verdict;

  const jobsToReverify = jobs.filter(needsReverification);

  const openJobsCount = jobs.filter((j) => j.status === "OPEN").length;
  const totalApplicants = allCandidates.length;
  const compatibleCount = scored.filter((c) => effectiveVerdict(c) === "COMPATIBLE").length;
  const borderlineCount = scored.filter((c) => effectiveVerdict(c) === "BORDERLINE").length;
  const notCompatibleCount = scored.filter((c) => effectiveVerdict(c) === "NOT_COMPATIBLE").length;
  const newThisWeek = allCandidates.filter((c) => c.uploadedAt >= oneWeekAgo).length;
  const averageScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, c) => sum + c.evaluation!.totalScore, 0) / scored.length)
      : 0;

  const appliedCount = allCandidates.filter((c) => c.source === "APPLIED").length;
  const uploadedCount = allCandidates.filter((c) => c.source === "RECRUITER_UPLOADED").length;

  const trend: { label: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const value = allCandidates.filter(
      (c) => c.uploadedAt >= day && c.uploadedAt < nextDay
    ).length;
    trend.push({ label: day.toLocaleDateString(undefined, { weekday: "narrow" }), value });
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Jobs at <span className="font-medium text-zinc-700">your company</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/jobs"
            target="_blank"
            className="text-sm font-medium rounded-md px-3 py-2 border border-blue-200 text-blue-700 bg-blue-50 hover:border-blue-300 transition-colors"
          >
            View careers page
          </Link>
          <Link
            href="/team"
            className="text-sm font-medium rounded-md px-3 py-2 border border-violet-200 text-violet-700 bg-violet-50 hover:border-violet-300 transition-colors"
          >
            + Invite teammate
          </Link>
          <Link
            href="/dashboard/new"
            className="bg-indigo-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-indigo-700 transition-colors"
          >
            + New job
          </Link>
        </div>
      </div>

      {jobsToReverify.length > 0 && (
        <div className="space-y-2">
          {jobsToReverify.map((job) => (
            <ReverifyJobBanner
              key={job.id}
              jobTitle={job.title}
              lastVerifiedActive={job.lastVerifiedActive}
              confirmAction={confirmJobStillOpen.bind(null, job.id)}
              showTitle
            />
          ))}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="border border-dashed border-zinc-300 rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-sm">No jobs yet.</p>
          <Link
            href="/dashboard/new"
            className="inline-block mt-3 text-sm font-medium text-indigo-700 hover:underline"
          >
            Create your first job posting
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatTile
              label="Open jobs"
              value={openJobsCount}
              icon="📌"
              color="text-indigo-700 bg-indigo-100"
            />
            <StatTile
              label="Total applicants"
              value={totalApplicants}
              icon="👥"
              color="text-blue-700 bg-blue-100"
            />
            <StatTile
              label="Compatible candidates"
              value={compatibleCount}
              icon="✨"
              color="text-emerald-700 bg-emerald-100"
            />
            <StatTile
              label="Average score"
              value={averageScore}
              icon="📊"
              color="text-violet-700 bg-violet-100"
            />
            <StatTile
              label="New this week"
              value={newThisWeek}
              icon="🆕"
              color="text-amber-700 bg-amber-100"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="bg-white border border-zinc-200 rounded-xl p-5 h-full">
              <h2 className="text-sm font-semibold text-zinc-900 mb-4">
                Hiring funnel — all jobs
              </h2>
              <HiringFunnelBar
                compatible={compatibleCount}
                borderline={borderlineCount}
                notCompatible={notCompatibleCount}
              />
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-5 h-full">
              <h2 className="text-sm font-semibold text-zinc-900 mb-4">Source of applicants</h2>
              <SourceBreakdownBar applied={appliedCount} uploaded={uploadedCount} />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">
              Applications — last 14 days
            </h2>
            <TrendBarChart data={trend} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <h2 className="text-sm font-medium text-zinc-900 mb-3">Jobs</h2>
              <div className="grid gap-3">
                {jobs.map((job) => {
                  const jobScored = job.candidates.filter((c) => c.evaluation);
                  const jobCompatible = jobScored.filter(
                    (c) =>
                      (c.evaluation!.manualVerdictOverride ?? c.evaluation!.verdict) ===
                      "COMPATIBLE"
                  ).length;
                  const jobBorderline = jobScored.filter(
                    (c) =>
                      (c.evaluation!.manualVerdictOverride ?? c.evaluation!.verdict) ===
                      "BORDERLINE"
                  ).length;
                  const jobNotCompatible = jobScored.filter(
                    (c) =>
                      (c.evaluation!.manualVerdictOverride ?? c.evaluation!.verdict) ===
                      "NOT_COMPATIBLE"
                  ).length;

                  return (
                    <Link
                      key={job.id}
                      href={`/dashboard/${job.id}`}
                      className="block bg-white border border-zinc-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-zinc-900 truncate">{job.title}</h3>
                            <StageBadge stage={job.stage} />
                            <JobStatusBadge status={job.status} />
                            {job.autoClosedAt && job.status === "CLOSED" && (
                              <span className="text-[11px] text-zinc-500">
                                auto-closed — not confirmed in 30 days
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                            {job.description}
                          </p>
                          <p className="text-xs text-zinc-400 mt-2">
                            Created by {job.creator.name} · {job.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-lg font-semibold text-zinc-900">
                            {job.candidates.length}
                          </div>
                          <div className="text-xs text-zinc-500">applicants</div>
                          <div className="text-xs text-zinc-400 mt-1 whitespace-nowrap">
                            <span className="text-emerald-600 font-medium">{jobCompatible}</span>{" "}
                            compatible ·{" "}
                            <span className="text-amber-600 font-medium">{jobBorderline}</span>{" "}
                            borderline ·{" "}
                            <span className="text-red-600 font-medium">{jobNotCompatible}</span>{" "}
                            not compatible
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-zinc-900 mb-3">Recent activity</h2>
              {recentActivity.length === 0 ? (
                <div className="border border-dashed border-zinc-300 rounded-xl p-6 text-center text-sm text-zinc-400">
                  Nothing yet.
                </div>
              ) : (
                <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100">
                  {recentActivity.map((c) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/${c.job.id}/candidates/${c.id}`}
                      className="block p-3.5 hover:bg-zinc-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-zinc-900 truncate">
                          {c.name}
                        </span>
                        <SourceTag source={c.source} />
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{c.job.title}</p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {c.uploadedAt.toLocaleDateString()}
                        {c.evaluation && (
                          <>
                            {" "}
                            · <span className="font-medium">{c.evaluation.totalScore}</span>/100
                          </>
                        )}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
