import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import StageBadge from "@/components/StageBadge";
import JobStatusBadge from "@/components/JobStatusBadge";
import CvUploadDropzone from "@/components/CvUploadDropzone";
import CandidatesTable, { type CandidateRow } from "@/components/CandidatesTable";
import ScoreHistogram from "@/components/ScoreHistogram";
import { SENIORITY_LABELS } from "@/lib/seniority";
import SalaryFields from "@/components/SalaryFields";
import { formatSalaryRange } from "@/lib/salary";
import ReverifyJobBanner from "@/components/ReverifyJobBanner";
import { closeStaleJobs, needsReverification } from "@/lib/jobVerification";
import { setJobStatus, setJobSalary, confirmJobStillOpen } from "../actions";
import { searchPipeline, rescoreJob } from "./actions";
import FunnelAuditPanel from "@/components/FunnelAuditPanel";
import { auditFunnel } from "@/lib/funnelAudit";
import { describeDuplicates } from "@/lib/duplicateLabel";
import { isScoringStale } from "@/lib/scoringRun";
import { retryScoring } from "./candidates/[candidateId]/actions";

// "Retry scoring" waits for the AI, which can take a minute.
export const maxDuration = 300;

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { jobId } = await params;
  await closeStaleJobs(session.user.companyId);

  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId: session.user.companyId },
    include: { creator: { select: { name: true } } },
  });
  if (!job) notFound();

  const candidates = await prisma.candidate.findMany({
    where: { jobId, job: { companyId: session.user.companyId } },
    include: {
      evaluation: true,
      statusChanges: { select: { fromStatus: true, toStatus: true }, orderBy: { changedAt: "asc" } },
    },
  });

  const duplicates = await describeDuplicates(session.user.companyId, candidates);
  const funnel = auditFunnel(candidates.map((c) => ({ status: c.status, history: c.statusChanges })));

  // Every candidate is listed — ones still being scored or whose scoring
  // failed show that instead of a score, below the ranked ones.
  const rows: CandidateRow[] = candidates
    .map((c) => {
      const evaluation = c.scoringStatus === "SCORED" ? c.evaluation : null;
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        uploadedAt: c.uploadedAt.toLocaleDateString(),
        scoring: evaluation
          ? ("scored" as const)
          : c.scoringStatus === "PENDING" && !isScoringStale(c)
            ? ("pending" as const)
            : ("failed" as const),
        scoringError: c.scoringError,
        totalScore: evaluation?.totalScore ?? null,
        verdict: evaluation?.verdict ?? null,
        manualVerdictOverride: evaluation?.manualVerdictOverride ?? null,
        flags: [
          ...(evaluation?.overqualified ? ["Overqualified"] : []),
          ...(evaluation?.keywordStuffing ? ["Skills listed without evidence"] : []),
        ],
        source: c.source,
        status: c.status,
        genericReasons: evaluation?.genericFlag ? (JSON.parse(evaluation.genericReasons) as string[]) : [],
        duplicate: duplicates.get(c.id) ?? null,
      };
    })
    .sort((a, b) => (b.totalScore ?? -1) - (a.totalScore ?? -1));
  const scores = rows.flatMap((r) => (r.totalScore === null ? [] : [r.totalScore]));

  const boundSetStatus = setJobStatus.bind(null, job.id);
  const boundSetSalary = setJobSalary.bind(null, job.id);
  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const nextStatus = job.status === "OPEN" ? "CLOSED" : "OPEN";

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-zinc-900">{job.title}</h1>
            <StageBadge stage={job.stage} />
            <JobStatusBadge status={job.status} />
          </div>
          <div className="flex items-center gap-3">
            {job.status === "OPEN" && (
              <Link
                href={`/jobs/${job.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline transition-colors"
              >
                View public posting →
              </Link>
            )}
            <form action={boundSetStatus}>
              <input type="hidden" name="status" value={nextStatus} />
              <button
                type="submit"
                className="text-sm font-medium rounded-md px-3 py-1.5 border border-zinc-300 text-zinc-700 hover:border-zinc-400 transition-colors"
              >
                {nextStatus === "CLOSED" ? "Close posting" : "Reopen posting"}
              </button>
            </form>
          </div>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          Posted by {job.creator.name} · {job.createdAt.toLocaleDateString()} · {job.location} ·{" "}
          {SENIORITY_LABELS[job.seniority] ?? job.seniority}
          {salary && <> · <span className="font-medium text-emerald-700">{salary}</span></>}
        </p>

        {needsReverification(job) && (
          <div className="mt-4">
            <ReverifyJobBanner
              jobTitle={job.title}
              lastVerifiedActive={job.lastVerifiedActive}
              confirmAction={confirmJobStillOpen.bind(null, job.id)}
            />
          </div>
        )}

        {job.status === "CLOSED" && job.autoClosedAt && (
          <p className="mt-4 text-sm text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
            Auto-closed on {job.autoClosedAt.toLocaleDateString()} because it wasn&apos;t confirmed
            as still open for 30 days. It&apos;s hidden from the public job board —{" "}
            <span className="font-medium">Reopen posting</span> above if you&apos;re still hiring.
          </p>
        )}

        {!salary && (
          <form action={boundSetSalary} className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Add a salary range</h3>
              <p className="text-xs text-amber-800/80">
                This posting was created before salary ranges were required. Most job seekers
                won&apos;t apply to a listing without pay.
              </p>
            </div>
            <SalaryFields />
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-indigo-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-indigo-700 transition-colors"
              >
                Save salary range
              </button>
            </div>
          </form>
        )}

        {job.stageContext && job.stageContext !== job.stage && (
          <div className="mt-4 bg-white border border-zinc-200 rounded-xl p-5">
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
              Stage context
            </h3>
            <p className="text-sm text-zinc-700">{job.stageContext}</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-medium text-zinc-900 mb-3">
          Bulk-upload CVs <span className="text-zinc-400 font-normal">(sourced outside the platform)</span>
        </h2>
        <CvUploadDropzone jobId={job.id} />
      </div>

      {scores.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-zinc-900 mb-3">Score distribution</h2>
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <ScoreHistogram scores={scores} />
          </div>
        </div>
      )}

      {candidates.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-zinc-900 mb-3">Hiring funnel</h2>
          <FunnelAuditPanel audit={funnel} />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-zinc-900">Ranked candidates</h2>
          {candidates.length > 0 && (
            <form action={rescoreJob.bind(null, job.id)}>
              <button
                type="submit"
                title="Re-run AI scoring for every candidate on this job (about 5-10 cents each)."
                className="text-xs font-medium text-indigo-700 hover:underline"
              >
                Rescore all
              </button>
            </form>
          )}
        </div>
        <CandidatesTable
          candidates={rows}
          jobId={job.id}
          searchAction={searchPipeline.bind(null, job.id)}
          retryAction={retryScoring.bind(null, job.id)}
        />
      </div>
    </div>
  );
}
