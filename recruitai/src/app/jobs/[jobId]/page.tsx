import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { applicantAuth } from "@/applicantAuth";
import ApplyGate from "@/components/ApplyGate";
import SaveJobButton from "@/components/SaveJobButton";
import RevealOnScroll from "@/components/motion/RevealOnScroll";
import KineticText from "@/components/motion/KineticText";
import { SENIORITY_LABELS } from "@/lib/seniority";
import { COMPANY_SIZE_LABELS } from "@/lib/companySize";
import { toggleSavedJob } from "@/lib/savedJobActions";
import { formatSalaryRange } from "@/lib/salary";
import { parseRequirements, isShortSkill } from "@/lib/requirements";
import { publicJobWhere, verifiedActiveLabel } from "@/lib/jobVerification";
import { applyToJob, checkFit, quickApplyWithProfile } from "./actions";

export default async function PublicJobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;

  const job = await prisma.job.findFirst({
    where: { id: jobId, ...publicJobWhere() },
    include: {
      company: { select: { name: true, industry: true, website: true, size: true, about: true } },
    },
  });
  if (!job) notFound();

  const session = await applicantAuth();
  const sessionUser = session?.user as { id: string; name?: string | null } | undefined;
  const applicant = sessionUser
    ? await prisma.applicant.findUnique({ where: { id: sessionUser.id } })
    : null;

  const existingApplication = applicant
    ? await prisma.candidate.findFirst({
        where: { jobId: job.id, source: "APPLIED", OR: [{ applicantId: applicant.id }, { email: applicant.email }] },
        select: { id: true, uploadedAt: true },
      })
    : null;

  const isSaved = applicant
    ? !!(await prisma.savedJob.findUnique({
        where: { applicantId_jobId: { applicantId: applicant.id, jobId: job.id } },
      }))
    : false;

  const salary = formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const requirements = parseRequirements(job.keySkills);
  const skillChips = requirements.filter(isShortSkill);
  const requirementSentences = requirements.filter((r) => !isShortSkill(r));

  return (
    <div>
      <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-6 py-14">
        <div className="max-w-3xl mx-auto">
          <Link href="/jobs" className="text-sm text-zinc-500 hover:text-blue-700 transition-colors">
            ← All open roles
          </Link>
          <div className="flex items-start justify-between gap-4">
            <KineticText
              text={job.title}
              as="h1"
              className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tight text-zinc-900"
            />
            <div className="mt-4 shrink-0">
              <SaveJobButton
                jobId={job.id}
                initialSaved={isSaved}
                isSignedIn={!!applicant}
                toggleAction={toggleSavedJob}
              />
            </div>
          </div>
          <p className="mt-3 text-zinc-500">
            {job.company.name} · {job.location} · {SENIORITY_LABELS[job.seniority] ?? job.seniority}
          </p>
          {salary && (
            <p className="mt-3 inline-block text-lg font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1">
              {salary}
            </p>
          )}
          <p
            className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700"
            title="The hiring team has confirmed this role is still open. Roles not re-confirmed within 30 days are removed automatically."
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {verifiedActiveLabel(job.lastVerifiedActive)} by the hiring team
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {(job.company.industry || job.company.about || job.company.website || job.company.size) && (
          <RevealOnScroll>
            <div className="bg-white border border-zinc-200 rounded-xl p-5">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                About {job.company.name}
              </h3>
              {job.company.about && (
                <p className="text-sm text-zinc-700 whitespace-pre-wrap mb-2">{job.company.about}</p>
              )}
              <p className="text-xs text-zinc-500">
                {[
                  job.company.industry,
                  job.company.size ? COMPANY_SIZE_LABELS[job.company.size] : null,
                  job.company.website,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </RevealOnScroll>
        )}

        <RevealOnScroll>
          <div className="bg-white border border-zinc-200 rounded-xl p-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
                About the role
              </h3>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{job.description}</p>
            </div>

            <div>
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
                What you&apos;ll need
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {skillChips.map((skill) => (
                  <span
                    key={skill}
                    className="text-xs bg-zinc-100 text-zinc-700 rounded-md px-2 py-1"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              {requirementSentences.length > 0 && (
                <ul className="mt-1 text-sm text-zinc-700 list-disc list-inside space-y-1">
                  {requirementSentences.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">
                What you&apos;ll own first
              </h3>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{job.whatTheyOwnFirst}</p>
            </div>
          </div>
        </RevealOnScroll>

        {applicant ? (
          <p className="text-sm text-zinc-500">
            Applying as <span className="font-medium text-zinc-700">{applicant.email}</span> ·{" "}
            <Link href="/my" className="text-blue-700 hover:underline">
              View my applications
            </Link>
          </p>
        ) : (
          <p className="text-sm text-zinc-500">
            <Link href={`/apply-login?callbackUrl=/jobs/${job.id}`} className="text-blue-700 hover:underline">
              Sign in
            </Link>{" "}
            to track this application and reuse a saved CV next time — or just check your fit and
            apply below, no account needed.
          </p>
        )}

        <RevealOnScroll delay={0.1}>
          {existingApplication ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap">
              <p className="text-sm text-emerald-900">
                ✓ You applied to this role on {existingApplication.uploadedAt.toLocaleDateString()}.
              </p>
              <Link href={`/my/${existingApplication.id}`} className="text-sm font-medium text-emerald-800 hover:underline">
                View status & messages →
              </Link>
            </div>
          ) : (
          <ApplyGate
            jobId={job.id}
            checkFitAction={checkFit}
            applyAction={applyToJob}
            quickApplyAction={quickApplyWithProfile}
            applicantDefaults={
              applicant
                ? {
                    name: applicant.name,
                    email: applicant.email,
                    phone: applicant.phone ?? "",
                    coverNote: applicant.savedCoverNote ?? "",
                    hasSavedCv: !!applicant.savedCvFileUrl,
                  }
                : undefined
            }
          />
          )}
        </RevealOnScroll>
      </div>
    </div>
  );
}
