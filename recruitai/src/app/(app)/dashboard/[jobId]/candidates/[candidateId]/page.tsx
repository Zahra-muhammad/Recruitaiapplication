import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import VerdictBadge from "@/components/VerdictBadge";
import SourceTag from "@/components/SourceTag";
import ApplicationStatusBadge from "@/components/ApplicationStatusBadge";
import ScoreBar from "@/components/ScoreBar";
import DimensionInsightList, { type DimensionInsightItem } from "@/components/DimensionInsightList";
import MessageThread, { type MessageItem } from "@/components/MessageThread";
import CandidateStatusControl from "@/components/CandidateStatusControl";
import { sendRecruiterMessage } from "@/lib/messageActions";
import { APPLICATION_STATUS_LABELS } from "@/lib/applicationStatus";
import { draftRejectionMessage, pickStrengthAndGap } from "@/lib/rejectionMessage";
import { analyzeGaps, COMPATIBLE_THRESHOLD } from "@/lib/gapAnalysis";
import { describeDuplicates } from "@/lib/duplicateLabel";
import InterviewQuestionsPanel, { type InterviewQuestionItem } from "@/components/InterviewQuestionsPanel";
import {
  updateEvaluation,
  setCandidateStatus,
  generateCandidateInterviewQuestions,
  saveCandidateInterviewQuestions,
} from "./actions";

const DIMENSION_KEYS = [
  { key: "skillsMatchScore", label: "Skills match with job", weight: 0.3 },
  { key: "buildingScore", label: "0→1 building evidence", weight: 0.25 },
  { key: "startupToleranceScore", label: "Startup / ambiguity tolerance", weight: 0.2 },
  { key: "trackRecordScore", label: "Track record of measurable impact", weight: 0.1 },
  { key: "redFlagScore", label: "Red flags (100 − deductions)", weight: 0.15 },
] as const;

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
  if (!candidate || !candidate.evaluation) notFound();

  const evaluation = candidate.evaluation;
  const strengths: DimensionInsightItem[] = JSON.parse(evaluation.strengths);
  const concerns: DimensionInsightItem[] = JSON.parse(evaluation.concerns);
  const potential: string[] = JSON.parse(evaluation.potential || "[]");
  const genericReasons: string[] = evaluation.genericFlag ? JSON.parse(evaluation.genericReasons) : [];
  const effectiveVerdict = evaluation.manualVerdictOverride ?? evaluation.verdict;
  const duplicate = (await describeDuplicates(session.user.companyId, [candidate])).get(candidate.id);
  const savedQuestions: InterviewQuestionItem[] | null = evaluation.interviewQuestions
    ? JSON.parse(evaluation.interviewQuestions)
    : null;
  const gaps = effectiveVerdict === "BORDERLINE" ? analyzeGaps(candidate.extractedText, candidate.job) : null;

  // Pull every other scored candidate for this job to build a comparison —
  // rank, gap to the top scorer, and per-dimension deltas vs. the job average.
  const siblings = await prisma.candidate.findMany({
    where: { jobId, job: { companyId: session.user.companyId } },
    include: { evaluation: true },
  });
  const scoredSiblings = siblings.filter((c) => c.evaluation);
  const ranked = [...scoredSiblings].sort(
    (a, b) => b.evaluation!.totalScore - a.evaluation!.totalScore
  );
  const rank = ranked.findIndex((c) => c.id === candidate.id) + 1;
  const total = ranked.length;
  const topScore = ranked[0]?.evaluation!.totalScore ?? evaluation.totalScore;
  const gapToTop = topScore - evaluation.totalScore;

  const avg = (key: (typeof DIMENSION_KEYS)[number]["key"]) =>
    scoredSiblings.reduce((sum, c) => sum + c.evaluation![key], 0) / (scoredSiblings.length || 1);

  const boundUpdate = updateEvaluation.bind(null, jobId, candidateId);
  const boundSendMessage = sendRecruiterMessage.bind(null, jobId, candidateId);
  const boundSetStatus = setCandidateStatus.bind(null, jobId, candidateId);

  const rejectionDraft = draftRejectionMessage({
    applicantName: candidate.name,
    jobTitle: candidate.job.title,
    companyName: candidate.job.company.name,
    recruiterName: session.user.name ?? "The hiring team",
    reachedInterview: ["INTERVIEWING", "OFFER"].includes(candidate.status),
    ...pickStrengthAndGap(candidate.extractedText, candidate.job),
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
          <div className="text-sm text-zinc-500 mt-0.5 space-x-3">
            {candidate.email && <span>{candidate.email}</span>}
            {candidate.phone && <span>{candidate.phone}</span>}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {candidate.source === "APPLIED" ? "Applied" : "Uploaded"}{" "}
            {candidate.uploadedAt.toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold text-zinc-900">
            {evaluation.totalScore}
            <span className="text-base text-zinc-400">/100</span>
          </div>
          <div className="mt-1 flex items-center justify-end gap-1.5">
            <VerdictBadge verdict={evaluation.manualVerdictOverride ?? evaluation.verdict} />
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
        </div>
      </div>

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
        View original CV (PDF) →
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

      {/* Executive summary — the "why" behind the number, in plain language */}
      <div className="bg-gradient-to-br from-indigo-900 to-violet-900 text-zinc-100 rounded-xl p-5">
        <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
          Summary
        </h2>
        <p className="text-sm leading-relaxed">{evaluation.summary}</p>
      </div>

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

      <InterviewQuestionsPanel
        initialQuestions={savedQuestions}
        generateAction={generateCandidateInterviewQuestions.bind(null, jobId, candidateId)}
        saveAction={saveCandidateInterviewQuestions.bind(null, jobId, candidateId)}
      />

      <div className="bg-white border border-zinc-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-zinc-900 mb-4">Scorecard breakdown</h2>
        <div className="space-y-5">
          {DIMENSION_KEYS.map((d) => (
            <ScoreBar
              key={d.key}
              label={d.label}
              score={evaluation[d.key]}
              weight={d.weight}
              compareToAvg={
                total > 1 ? Math.round(evaluation[d.key] - avg(d.key)) : undefined
              }
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-emerald-700 mb-3">
            What makes them a good candidate
          </h2>
          <DimensionInsightList items={strengths} tone="positive" />
        </div>
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-amber-700 mb-3">
            What they lacked / concerns
          </h2>
          <DimensionInsightList items={concerns} tone="negative" />
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-violet-700 mb-3">Growth potential</h2>
        <ul className="space-y-2 text-sm text-zinc-700 list-disc list-inside">
          {potential.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>

      {total > 1 && (
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
            show how each dimension compares to the average across all candidates for this job.
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
