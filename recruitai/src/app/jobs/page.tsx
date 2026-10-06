import { prisma } from "@/lib/prisma";
import { closeStaleJobs, publicJobWhere, verifiedActiveLabel } from "@/lib/jobVerification";
import { applicantAuth } from "@/applicantAuth";
import JobSearch, { type PublicJobListing } from "@/components/JobSearch";
import GradientMesh from "@/components/motion/GradientMesh";
import KineticText from "@/components/motion/KineticText";
import { createSavedSearch } from "@/app/my/saved-searches/actions";
import { toggleSavedJob } from "@/lib/savedJobActions";
import { formatSalaryRange } from "@/lib/salary";
import { parseRequirements, isShortSkill } from "@/lib/requirements";
import { cityFromText, isRemoteLocation } from "@/lib/cities";

export const dynamic = "force-dynamic";

function jobCoords(location: string): { lat: number; lng: number } | null {
  const city = cityFromText(location);
  return city ? { lat: city.lat, lng: city.lng } : null;
}

export default async function PublicJobsPage() {
  await closeStaleJobs();
  const [jobs, session] = await Promise.all([
    prisma.job.findMany({
      where: publicJobWhere(),
      orderBy: { createdAt: "desc" },
      include: { company: { select: { name: true } } },
    }),
    applicantAuth(),
  ]);
  const sessionUser = session?.user as { id: string } | undefined;
  const isApplicantSignedIn = !!sessionUser;

  const savedJobIds = sessionUser
    ? (
        await prisma.savedJob.findMany({
          where: { applicantId: sessionUser.id },
          select: { jobId: true },
        })
      ).map((s) => s.jobId)
    : [];

  const listings: PublicJobListing[] = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    description: job.description,
    companyName: job.company.name,
    location: job.location,
    seniority: job.seniority,
    verifiedLabel: verifiedActiveLabel(job.lastVerifiedActive),
    salary: formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency),
    // Only named skills become filter chips — full requirement sentences
    // would swamp the sidebar.
    skills: parseRequirements(job.keySkills).filter(isShortSkill),
    coords: jobCoords(job.location),
    remote: isRemoteLocation(job.location),
  }));

  const homeCity = sessionUser
    ? (await prisma.applicant.findUnique({ where: { id: sessionUser.id }, select: { city: true } }))?.city ?? ""
    : "";

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-6 py-16 sm:py-20">
        <GradientMesh />
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <span className="inline-block text-xs font-medium tracking-wide uppercase text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-3 py-1 mb-5">
            {jobs.length} open role{jobs.length === 1 ? "" : "s"} right now
          </span>
          <KineticText
            text="Find your next role"
            as="h1"
            className="text-4xl sm:text-6xl font-semibold tracking-tight text-zinc-900"
          />
          <KineticText
            text="Search, filter, and apply — no account required."
            as="p"
            delay={0.35}
            className="mt-4 text-lg text-zinc-500"
          />
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {jobs.length === 0 ? (
          <div className="border border-dashed border-zinc-300 rounded-xl p-12 text-center text-sm text-zinc-500">
            No open roles right now. Check back soon.
          </div>
        ) : (
          <JobSearch
            jobs={listings}
            isApplicantSignedIn={isApplicantSignedIn}
            savedJobIds={savedJobIds}
            saveSearchAction={createSavedSearch}
            toggleSavedJobAction={toggleSavedJob}
            homeCity={homeCity}
          />
        )}
      </div>
    </div>
  );
}
