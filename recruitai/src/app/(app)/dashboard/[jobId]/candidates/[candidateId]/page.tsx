import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import VerdictBadge from "@/components/VerdictBadge";
import SourceTag from "@/components/SourceTag";
import ApplicationStatusBadge from "@/components/ApplicationStatusBadge";
import ScoreBar from "@/components/ScoreBar";
import ScoringStatus from "@/components/ScoringStatus";
import DimensionInsightList, { type DimensionInsightItem } from "@/components/DimensionInsightList";
import MessageThread, { type MessageItem } from "@/components/MessageThread";
import CandidateStatusControl from "@/components/CandidateStatusControl";
import { sendRecruiterMessage } from "@/lib/messageActions";
import { APPLICATION_STATUS_LABELS } from "@/lib/applicationStatus";
import { draftRejectionMessage, pickStrengthAndGap } from "@/lib/rejectionMessage";
import { analyzeGaps, COMPATIBLE_THRESHOLD } from "@/lib/gapAnalysis";
import { describeDuplicates } from "@/lib/duplicateLabel";
import { readScoringDetails, RUBRIC_WEIGHTS, type RequirementResult } from "@/lib/scoring";
import { isScoringStale } from "@/lib/scoringRun";
import InterviewQuestionsPanel, { type InterviewQuestionItem } from "@/components/InterviewQuestionsPanel";
import {
  updateEvaluation,
  setCandidateStatus,
  generateCandidateInterviewQuestions,
  saveCandidateInterviewQuestions,
  retryScoring,
} from "./actions";

// "Retry scoring" waits for the AI, which can take a minute.
export const maxDuration = 300;

const PARTS = [
  { key: "mustHaveScore", label: "Must-haves", weight: RUBRIC_WEIGHTS.mustHaves / 100 },
  { key: "experienceScore", label: "Relevant experience", weight: RUBRIC_WEIGHTS.experience / 100 },
  { key: "niceToHaveScore", label: "Nice-to-haves", weight: RUBRIC_WEIGHTS.niceToHaves / 100 },
  { key: "otherScore", label: "Other (impact, education)", weight: RUBRIC_WEIGHTS.other / 100 },
] as const;

const EVIDENCE_LABELS: Record<RequirementResult["evidenceType"], string> = {
  work_experience: "work experience",
  project: "project",
  education: "education",
  skills_list_only: "skills list only",
  none: "no evidence",
};

function RequirementList({ items, empty }: { items: RequirementResult[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-zinc-400">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((r) => (
        <li key={r.requirement} className="text-sm">
          <div className="flex items-start gap-2">
            <span
              className={`mt-0.5 shrink-0 text-[10px] font-medium rounded-full px-2 py-0.5 border ${
                r.credit >= 1
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : r.demonstrated
                    ? "text-amber-700 bg-amber-50 border-amber-200"
                    : "text-red-700 bg-red-50 border-red-200"
              }`}
            >
              {r.level === "missing" ? "missing" : `${r.level} · ${EVIDENCE_LABELS[r.evidenceType]}`}
            </span>
            <span className="text-zinc-900">{r.requirement}</span>
          </div>
          {r.evidence && <p className="text-xs text-zinc-500 mt-0.5 ml-1">{r.evidence}</p>}
        </li>
      ))}
    </ul>
  );
}

function PointList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-zinc-400">{empty}</p>;
  return (
    <ul className="space-y-2 text-sm text-zinc-700 list-disc list-inside">
      {items.map((p, i) => (
        <li key={i}>{p}</li>
      ))}
    </ul>
  );
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ jobId: string; candidateId: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { jobId, candidateId } = await params;

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, jobId, job: { companyId: session.user.companyId } },
    include: {
      evaluation: true,
      job: { include: { company: { select: { name: true } } } },
      statusChanges: { orderBy: { changedAt: "desc" } },
    },
  });
  if (!candidate) notFound();

  const evaluation = candidate.scoringStatus === "SCORED" ? candidate.evaluation : null;
  const details = evaluation ? readScoringDetails(evaluation) : null;
  const scoringState: "pending" | "failed" | null = evaluation
    ? null
    : candidate.scoringStatus === "PENDING" && !isScoringStale(candidate)
      ? "pending"
      : "failed";
  const scoringError =
    candidate.scoringStatus === "PENDING" ? "Scoring didn't finish in time." : candidate.scoringError;

  const effectiveVerdict = evaluation ? evaluation.manualVerdictOverride ?? evaluation.verdict : null;
  const genericReasons: string[] = evaluation?.genericFlag ? JSON.parse(evaluation.genericReasons) : [];
  const duplicate = (await describeDuplicates(session.user.companyId, [candidate])).get(candidate.id);
  const savedQuestions: InterviewQuestionItem[] | null = evaluation?.interviewQuestions
    ? JSON.parse(evaluation.interviewQuestions)
    : null;
  const gaps =
    evaluation && details && effectiveVerdict === "BORDERLINE" ? analyzeGaps(details, evaluation.totalScore) : null;

  // Pull every other scored candidate for this job to build a comparison —
  // rank, gap to the top scorer, and per-part deltas vs. the job average.
  const siblings = await prisma.candidate.findMany({
    where: { jobId, job: { companyId: session.user.companyId }, scoringStatus: "SCORED" },
    include: { evaluation: true },
  });
  const ranked = siblings
    .filter((c) => c.evaluation)
    .sort((a, b) => b.evaluation!.totalScore - a.evaluation!.totalScore);
  const rank = ranked.findIndex((c) => c.id === candidate.id) + 1;
  const total = ranked.length;
  const gapToTop = evaluation ? (ranked[0]?.evaluation!.totalScore ?? evaluation.totalScore) - evaluation.totalScore : 0;
  const comparable = ranked.filter((c) => c.evaluation!.scoringVersion !== "legacy");
  const avg = (key: (typeof PARTS)[number]["key"]) =>
    comparable.reduce((sum, c) => sum + c.evaluation![key], 0) / (comparable.length || 1);

  const boundUpdate = updateEvaluation.bind(null, jobId, candidateId);
  const boundSendMessage = sendRecruiterMessage.bind(null, jobId, candidateId);
  const boundSetStatus = setCandidateStatus.bind(null, jobId, candidateId);
  const boundRetry = retryScoring.bind(null, jobId, candidateId);

  const rejectionDraft = draftRejectionMessage({
    applicantName: candidate.name,
    jobTitle: candidate.job.title,
    companyName: candidate.job.company.name,
    recruiterName: session.user.name ?? "The hiring team",
    reachedInterview: ["INTERVIEWING", "OFFER"].includes(candidate.status),
    ...pickStrengthAndGap(details),
  });

  const messageRows = candidate.source === "APPLIED"
    ? await prisma.message.findMany({ where: { candidateId }, orderBy: { createdAt: "asc" } })
    : [];
  const messages: MessageItem[] = messageRows.map((m) => ({
    id: m.id,
    sender: m.sender,
    senderName: m.senderName,
    body: m.body,
    createdAt: m.createdAt.toLocaleString(),
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          href={`/dashboard/${jobId}`}
          className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          ← Back to {candidate.job.title}
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-zinc-900">{candidate.name}</h1>
            <SourceTag source={candidate.source} />
            <ApplicationStatusBadge status={candidate.status} />
          </div>
          {candidate.formName && (
            <p className="text-xs text-zinc-400 mt-0.5">Name on application form: {candidate.formName}</p>
          )}
          <div className="text-sm text-zinc-500 mt-0.5 space-x-3">
            {candidate.email && <span>{candidate.email}</span>}
            {candidate.phone && <span>{candidate.phone}</span>}
            {details?.profile.location && <span>{details.profile.location}</span>}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {candidate.source === "APPLIED" ? "Applied" : "Uploaded"}{" "}
            {candidate.uploadedAt.toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          {evaluation ? (
            <>
              <div className="text-3xl font-semibold text-zinc-900">
                {evaluation.totalScore}
                <span className="text-base text-zinc-400">/100</span>
              </div>
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <VerdictBadge verdict={effectiveVerdict!} />
                {evaluation.manualVerdictOverride && (
                  <span className="text-[10px] text-zinc-400">
                    (overridden from {evaluation.verdict})
                  </span>
                )}
              </div>
              {total > 1 && (
                <p className="text-xs text-zinc-400 mt-1">
                  Ranked #{rank} of {total} for this job
                </p>
              )}
            </>
          ) : (
            <ScoringStatus state={scoringState!} error={scoringError} retryAction={boundRetry} />
          )}
        </div>
      </div>

      {evaluation && !details && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            This score came from the old keyword scorer, which didn&apos;t read the full job description or
            check where skills were used. Rescore to get the AI assessment.
          </p>
          <ScoringStatus state="failed" retryAction={boundRetry} compact />
        </div>
      )}

      {(evaluation?.overqualified || evaluation?.keywordStuffing) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 space-y-1">
          {evaluation.overqualified && (
            <p className="text-sm text-orange-900">
              <span className="font-medium">Flagged: overqualified.</span> {details?.seniorityReason}
            </p>
          )}
          {evaluation.keywordStuffing && (
            <p className="text-sm text-orange-900">
              <span className="font-medium">Flagged: skills listed without evidence.</span>{" "}
              {details?.keywordStuffingReason}
            </p>
          )}
          <p className="text-[11px] text-orange-800/80">Flags are for a human to review — they never reject anyone automatically.</p>
        </div>
      )}

      {duplicate && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-rose-900">Possible duplicate application</p>
          <p className="text-xs text-rose-800 mt-1">
            {duplicate.label}.{" "}
            <Link href={duplicate.href} className="font-medium underline">
              View that application
            </Link>
          </p>
          <p className="mt-1.5 text-[11px] text-rose-700/80">
            Informational only — it may be a re-upload, a re-application, or the same CV sent to two roles. It never
            affects the score or verdict.
          </p>
        </div>
      )}

      {genericReasons.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm font-medium text-amber-900">Possibly generic application</p>
          <ul className="mt-1 text-xs text-amber-800 list-disc list-inside space-y-0.5">
            {genericReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-amber-700/80">
            A hint to read this CV closely, not a judgment — it never changes the score or verdict,
            and plenty of strong people write sparse CVs.
          </p>
        </div>
      )}

      <a
        href={`/api/candidates/${candidate.id}/cv`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm text-zinc-900 font-medium hover:underline"
      >
        View original CV →
      </a>

      <div className="space-y-2">
        <CandidateStatusControl
          key={candidate.status}
          currentStatus={candidate.status}
          isApplicant={candidate.source === "APPLIED"}
          hasEmail={!!candidate.email}
          rejectionDraft={rejectionDraft}
          setStatusAction={boundSetStatus}
        />
        {candidate.statusChanges.length > 0 && (
          <details className="text-xs text-zinc-500 px-1">
            <summary className="cursor-pointer hover:text-zinc-800">
              Status last changed {candidate.statusUpdatedAt.toLocaleString()} · history (
              {candidate.statusChanges.length})
            </summary>
            <ul className="mt-2 space-y-1 pl-3 border-l border-zinc-200">
              {candidate.statusChanges.map((c) => (
                <li key={c.id}>
                  <span className="text-zinc-700">
                    {c.fromStatus ? APPLICATION_STATUS_LABELS[c.fromStatus] : "—"} →{" "}
                    {APPLICATION_STATUS_LABELS[c.toStatus]}
                  </span>{" "}
                  · {c.changedByName} · {c.changedAt.toLocaleString()}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {candidate.qualifications && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Qualifications listed by applicant
          </h2>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{candidate.qualifications}</p>
        </div>
      )}

      {candidate.coverNote && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Cover note from applicant
          </h2>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{candidate.coverNote}</p>
        </div>
      )}

      {candidate.source === "APPLIED" && (
        <MessageThread
          messages={messages}
          sendAction={boundSendMessage}
          selfSender="RECRUITER"
          accent="indigo"
          subtitle={
            candidate.email
              ? "They're emailed each message and can reply from their status page."
              : "They'll see messages on their status page."
          }
          suggestions={[
            "Can you share your availability for a call this week?",
            "Could you tell us a bit more about your most relevant project?",
            "What are your salary expectations for this role?",
          ]}
        />
      )}

      {evaluation && (
        // Executive summary — the "why" behind the number, in plain language
        <div className="bg-gradient-to-br from-indigo-900 to-violet-900 text-zinc-100 rounded-xl p-5">
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
            Summary
          </h2>
          <p className="text-sm leading-relaxed">{evaluation.summary}</p>
          {details && details.caps.length > 0 && (
            <ul className="mt-3 text-xs text-zinc-300 space-y-1">
              {details.caps.map((c) => (
                <li key={c}>
                  Score capped (would otherwise be {details.rawScore}): {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {gaps && gaps.suggestions.length > 0 && (
        <div className="bg-white border border-blue-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-blue-900">What would strengthen this application</h2>
          <p className="text-xs text-zinc-500 mt-0.5 mb-3">
            {gaps.pointsNeeded > 0
              ? `${gaps.pointsNeeded} point${gaps.pointsNeeded === 1 ? "" : "s"} short of Compatible (${COMPATIBLE_THRESHOLD}). `
              : ""}
            These are the gaps costing the most points. Addressing them would bring the score to about{" "}
            {gaps.projectedScore}. They may simply be unstated on the CV, so they&apos;re worth probing
            rather than assuming.
          </p>
          <ul className="space-y-2.5">
            {gaps.suggestions.map((s) => (
              <li key={s.gap} className="flex gap-3 text-sm">
                <span className="shrink-0 w-14 text-right font-semibold text-blue-700 tabular-nums">
                  +{s.estimatedPoints}
                </span>
                <div>
                  <p className="text-zinc-900">{s.gap}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{s.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {details && (
        <InterviewQuestionsPanel
          initialQuestions={savedQuestions}
          generateAction={generateCandidateInterviewQuestions.bind(null, jobId, candidateId)}
          saveAction={saveCandidateInterviewQuestions.bind(null, jobId, candidateId)}
        />
      )}

      {evaluation && details && (
        <>
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">Scorecard breakdown</h2>
            <div className="space-y-5">
              {PARTS.map((d) => (
                <ScoreBar
                  key={d.key}
                  label={d.label}
                  score={evaluation[d.key]}
                  weight={d.weight}
                  compareToAvg={comparable.length > 1 ? Math.round(evaluation[d.key] - avg(d.key)) : undefined}
                />
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-4">
              Relevant experience: <span className="font-medium text-zinc-800">{details.experience.relevantYears} years</span>{" "}
              (of {details.experience.totalYears} in total) — the role asks for {details.experience.requiredYears}
              {details.rubric.requiredYearsSource === "seniority default" ? " (default for this seniority level)" : ""}.
              {details.experience.undatedRoles > 0 &&
                ` ${details.experience.undatedRoles} role${details.experience.undatedRoles > 1 ? "s have" : " has"} no dates and couldn't be counted.`}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-emerald-700 mb-3">Must-haves matched</h2>
              <RequirementList items={details.mustHaves.filter((r) => r.demonstrated)} empty="None demonstrated." />
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-red-700 mb-3">Must-haves missing</h2>
              <RequirementList items={details.mustHaves.filter((r) => !r.demonstrated)} empty="None — every must-have is demonstrated." />
            </div>
          </div>

          {details.niceToHaves.length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-zinc-900 mb-3">Nice-to-haves</h2>
              <RequirementList items={details.niceToHaves} empty="" />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-emerald-700 mb-3">Strengths</h2>
              <PointList items={JSON.parse(evaluation.strengths) as string[]} empty="No standout strengths." />
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-amber-700 mb-3">Concerns</h2>
              <PointList items={JSON.parse(evaluation.concerns) as string[]} empty="No significant concerns." />
            </div>
          </div>
        </>
      )}

      {evaluation && !details && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-emerald-700 mb-3">What makes them a good candidate</h2>
            <DimensionInsightList items={JSON.parse(evaluation.strengths) as DimensionInsightItem[]} tone="positive" />
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-amber-700 mb-3">What they lacked / concerns</h2>
            <DimensionInsightList items={JSON.parse(evaluation.concerns) as DimensionInsightItem[]} tone="negative" />
          </div>
        </div>
      )}

      {evaluation && total > 1 && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-900 mb-1">
            How they compare to other candidates for this job
          </h2>
          <p className="text-sm text-zinc-600 mb-4">
            Ranked <span className="font-medium text-zinc-900">#{rank}</span> of{" "}
            {total} candidates.{" "}
            {gapToTop === 0 ? (
              <span className="text-emerald-600 font-medium">Top scorer for this job.</span>
            ) : (
              <>
                <span className="font-medium text-zinc-900">{gapToTop} points</span> behind the
                top-ranked candidate.
              </>
            )}{" "}
            The <span className="text-emerald-600">+ / −</span> figures on the scorecard above
            show how each part compares to the average across candidates for this job.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ranked.slice(0, 6).map((c, i) => (
              <Link
                key={c.id}
                href={`/dashboard/${jobId}/candidates/${c.id}`}
                className={`rounded-lg border px-3 py-2 text-xs ${
                  c.id === candidate.id
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="font-medium text-zinc-900 truncate">
                  #{i + 1} {c.name}
                </div>
                <div className="text-zinc-500">{c.evaluation!.totalScore}/100</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {evaluation && (
        <form action={boundUpdate} className="space-y-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Internal review</h2>
              <p className="text-xs text-zinc-400">Only visible to your team — never shown to the applicant.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Manual verdict override
              </label>
              <select
                name="manualVerdictOverride"
                defaultValue={evaluation.manualVerdictOverride ?? ""}
                className="w-full sm:w-64 rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
              >
                <option value="">Use automatic verdict ({evaluation.verdict})</option>
                <option value="COMPATIBLE">Compatible</option>
                <option value="BORDERLINE">Borderline</option>
                <option value="NOT_COMPATIBLE">Not compatible</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                rows={4}
                defaultValue={evaluation.notes}
                placeholder="Interview impressions, reference notes, context for other recruiters…"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-indigo-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-indigo-700 transition-colors"
              >
                Save review
              </button>
            </div>
          </div>
        </form>
      )}

      <details className="bg-white border border-zinc-200 rounded-xl p-5">
        <summary className="text-sm font-semibold text-zinc-900 cursor-pointer">
          Extracted CV text
        </summary>
        <pre className="mt-3 text-xs text-zinc-600 whitespace-pre-wrap max-h-96 overflow-y-auto">
          {candidate.extractedText}
        </pre>
      </details>
    </div>
  );
}
