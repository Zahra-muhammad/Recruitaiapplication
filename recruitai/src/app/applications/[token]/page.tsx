import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ApplicationStatusBadge from "@/components/ApplicationStatusBadge";
import ApplicationProgress from "@/components/ApplicationProgress";
import MessageThread, { type MessageItem } from "@/components/MessageThread";
import { sendApplicantMessageByToken } from "@/lib/messageActions";

export const dynamic = "force-dynamic";

// Public, account-free status page. Access is by the secret token only.
// Deliberately never loads `evaluation` — applicants must never be able to
// see a score, verdict, or recruiter notes.
export default async function ApplicationStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { statusToken: token },
    select: {
      id: true,
      name: true,
      source: true,
      status: true,
      statusUpdatedAt: true,
      uploadedAt: true,
      jobId: true,
      job: { select: { title: true, location: true, status: true, company: { select: { name: true } } } },
    },
  });
  if (!candidate || candidate.source !== "APPLIED") notFound();

  const jobIsOpen = candidate.job.status === "OPEN";

  const messageRows = await prisma.message.findMany({
    where: { candidateId: candidate.id },
    orderBy: { createdAt: "asc" },
  });
  const messages: MessageItem[] = messageRows.map((m) => ({
    id: m.id,
    sender: m.sender,
    senderName: m.senderName,
    body: m.body,
    createdAt: m.createdAt.toLocaleString(),
  }));
  const boundSendMessage = sendApplicantMessageByToken.bind(null, token);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-wide">Application status</p>
          <h1 className="text-xl font-semibold text-zinc-900 mt-1">{candidate.job.title}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {candidate.job.company.name} · {candidate.job.location}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {candidate.name} · applied {candidate.uploadedAt.toLocaleDateString()}
            {!jobIsOpen && " · This posting has since closed"}
          </p>
        </div>
        <ApplicationStatusBadge status={candidate.status} />
      </div>

      <ApplicationProgress status={candidate.status} updatedAt={candidate.statusUpdatedAt} />

      {jobIsOpen && (
        <Link href={`/jobs/${candidate.jobId}`} className="inline-block text-sm text-blue-700 hover:underline">
          View job posting →
        </Link>
      )}

      <MessageThread
        messages={messages}
        sendAction={boundSendMessage}
        selfSender="APPLICANT"
        accent="blue"
        subtitle="Questions for the hiring team? Ask here — they'll be notified."
      />

      <p className="text-xs text-zinc-400">
        Bookmark this page — it&apos;s private to you. Lost the link?{" "}
        <Link href="/status" className="text-blue-700 hover:underline">
          Get it emailed again
        </Link>
        .
      </p>
    </div>
  );
}
