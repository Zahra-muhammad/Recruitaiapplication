import { notFound } from "next/navigation";
import Link from "next/link";
import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";
import ApplicationStatusBadge from "@/components/ApplicationStatusBadge";
import ApplicationProgress from "@/components/ApplicationProgress";
import MessageThread, { type MessageItem } from "@/components/MessageThread";
import { sendApplicantMessage } from "@/lib/messageActions";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const session = await applicantAuth();
  const user = session?.user as { id: string } | undefined;
  if (!user) return null;

  const { candidateId } = await params;

  // Deliberately no `evaluation` here either — same rule as the list page.
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, applicantId: user.id },
    include: { job: { include: { company: { select: { name: true } } } } },
  });
  if (!candidate) notFound();

  const messageRows = await prisma.message.findMany({
    where: { candidateId },
    orderBy: { createdAt: "asc" },
  });
  const messages: MessageItem[] = messageRows.map((m) => ({
    id: m.id,
    sender: m.sender,
    senderName: m.senderName,
    body: m.body,
    createdAt: m.createdAt.toLocaleString(),
  }));

  const boundSendMessage = sendApplicantMessage.bind(null, candidateId);
  const jobIsOpen = candidate.job.status === "OPEN";

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <Link href="/my" className="text-sm text-zinc-500 hover:text-blue-700 transition-colors">
        ← My applications
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{candidate.job.title}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {candidate.job.company.name} · {candidate.job.location}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Applied {candidate.uploadedAt.toLocaleDateString()}
            {!jobIsOpen && " · This posting has since closed"}
          </p>
        </div>
        <ApplicationStatusBadge status={candidate.status} />
      </div>

      <ApplicationProgress status={candidate.status} updatedAt={candidate.statusUpdatedAt} />

      {jobIsOpen && (
        <Link
          href={`/jobs/${candidate.jobId}`}
          className="inline-block text-sm text-blue-700 hover:underline"
        >
          View job posting →
        </Link>
      )}

      {candidate.qualifications && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Qualifications you listed
          </h2>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{candidate.qualifications}</p>
        </div>
      )}

      {candidate.coverNote && (
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
            Your cover note
          </h2>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{candidate.coverNote}</p>
        </div>
      )}

      <MessageThread
        messages={messages}
        sendAction={boundSendMessage}
        selfSender="APPLICANT"
        accent="blue"
      />
    </div>
  );
}
