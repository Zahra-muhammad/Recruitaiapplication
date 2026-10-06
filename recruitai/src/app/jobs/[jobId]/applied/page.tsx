import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { applicantAuth } from "@/applicantAuth";
import RevealOnScroll from "@/components/motion/RevealOnScroll";

export default async function ApplicationReceivedPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { jobId } = await params;
  const { t: statusToken } = await searchParams;
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { title: true } });

  // Soft prompt, only for people who applied without an account and don't
  // already have one under that email. Never required.
  const session = await applicantAuth();
  const candidate = statusToken && !session?.user
    ? await prisma.candidate.findUnique({
        where: { statusToken },
        select: { email: true, applicantId: true },
      })
    : null;
  const showSavePrompt =
    !!candidate?.email &&
    !candidate.applicantId &&
    !(await prisma.applicant.findUnique({ where: { email: candidate.email }, select: { id: true } }));

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-blue-50 px-4">
      <RevealOnScroll y={20}>
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 text-white flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg shadow-emerald-500/30">
            ✓
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900">Application received</h1>
          <p className="text-sm text-zinc-600 mt-3 leading-relaxed">
            Thanks — your application{job ? ` for ${job.title}` : ""} has been received.
            You&apos;ll see every status change as it happens — no waiting in the dark.
          </p>
          {statusToken && (
            <Link
              href={`/applications/${statusToken}`}
              className="inline-block mt-6 bg-blue-600 text-white text-sm font-medium rounded-md px-5 py-2 hover:bg-blue-700 transition-colors"
            >
              Track your application →
            </Link>
          )}
          <p className="text-xs text-zinc-400 mt-3">
            We&apos;ve also emailed you this private link.
          </p>
          {showSavePrompt && (
            <div className="mt-8 bg-white border border-violet-200 rounded-xl p-5 text-left shadow-sm">
              <p className="text-sm font-semibold text-zinc-900">Save your info to apply faster next time?</p>
              <p className="text-xs text-zinc-500 mt-1">
                Just set a password — we&apos;ll keep the CV and details you just entered, so your next
                application is one click.
              </p>
              <Link
                href={`/apply-signup?from=${statusToken}`}
                className="inline-block mt-3 text-sm font-medium bg-violet-600 text-white rounded-md px-4 py-1.5 hover:bg-violet-700 transition-colors"
              >
                Save my info
              </Link>
              <span className="ml-3 text-xs text-zinc-400">No thanks is fine too.</span>
            </div>
          )}
          <Link
            href="/jobs"
            className="block mt-6 text-sm font-medium text-blue-700 hover:underline"
          >
            ← Back to open roles
          </Link>
        </div>
      </RevealOnScroll>
    </div>
  );
}
