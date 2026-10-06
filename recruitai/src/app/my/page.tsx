import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";
import { closeStaleJobs } from "@/lib/jobVerification";
import MyApplicationsTabs, {
  type ApplicationRow,
  type SavedJobRow,
} from "@/components/MyApplicationsTabs";
import { toggleSavedJob } from "@/lib/savedJobActions";

export default async function MyApplicationsPage() {
  const session = await applicantAuth();
  const user = session?.user as { id: string } | undefined;
  if (!user) return null;
  await closeStaleJobs();

  // Deliberately no `evaluation` in either query — applicants must never be
  // able to receive a score or verdict, even indirectly through this page.
  const [applications, savedJobRows] = await Promise.all([
    prisma.candidate.findMany({
      where: { applicantId: user.id },
      include: { job: { include: { company: { select: { name: true } } } } },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.savedJob.findMany({
      where: { applicantId: user.id },
      include: { job: { include: { company: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const applicationRows: ApplicationRow[] = applications.map((app) => ({
    id: app.id,
    jobId: app.jobId,
    jobTitle: app.job.title,
    companyName: app.job.company.name,
    location: app.job.location,
    appliedAt: app.uploadedAt.toLocaleDateString(),
    status: app.status,
    jobOpen: app.job.status === "OPEN",
  }));

  const savedJobRowsMapped: SavedJobRow[] = savedJobRows.map((s) => ({
    jobId: s.jobId,
    title: s.job.title,
    companyName: s.job.company.name,
    location: s.job.location,
    jobOpen: s.job.status === "OPEN",
  }));

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">My applications</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Everything you&apos;ve applied to, saved, and what&apos;s under review.
        </p>
      </div>

      <MyApplicationsTabs
        applications={applicationRows}
        savedJobs={savedJobRowsMapped}
        toggleSavedJobAction={toggleSavedJob}
      />
    </div>
  );
}
