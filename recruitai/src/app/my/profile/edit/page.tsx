import Link from "next/link";
import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";
import ProfileEditor from "@/components/ProfileEditor";
import { updateProfile, draftProfileFromCv } from "../actions";

// "Fill from my CV" runs the AI extractor (~20 seconds).
export const maxDuration = 120;

export default async function EditProfilePage() {
  const session = await applicantAuth();
  const sessionUser = session?.user as { id: string } | undefined;
  if (!sessionUser) return null;

  const a = await prisma.applicant.findUnique({
    where: { id: sessionUser.id },
    include: {
      experiences: { orderBy: { sortOrder: "asc" } },
      educations: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!a) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Edit your profile</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Sections marked * are required. Your city is optional and only used to show jobs near you.
          </p>
        </div>
        <Link href="/my/profile" className="text-sm text-zinc-500 hover:text-zinc-900">
          Cancel
        </Link>
      </div>

      <ProfileEditor
        defaults={{
          name: a.name,
          phone: a.phone ?? "",
          headline: a.headline ?? "",
          about: a.about ?? "",
          skills: a.skills ?? "",
          languages: a.languages ?? "",
          city: a.city ?? "",
          linkedinUrl: a.linkedinUrl ?? "",
          portfolioUrl: a.portfolioUrl ?? "",
          seniority: a.seniority ?? "",
          desiredTitle: a.desiredTitle ?? "",
          yearsOfExperience: a.yearsOfExperience?.toString() ?? "",
          workAuthorization: a.workAuthorization ?? "",
          remotePreference: a.remotePreference ?? "",
          noticePeriod: a.noticePeriod ?? "",
          salaryExpectation: a.salaryExpectation ?? "",
          savedCoverNote: a.savedCoverNote ?? "",
          openToWork: a.openToWork,
          hasSavedCv: !!a.savedCvFileUrl,
          experiences: a.experiences.map((e) => ({
            title: e.title,
            company: e.company,
            location: e.location ?? "",
            startDate: e.startDate,
            endDate: e.endDate ?? "",
            description: e.description,
          })),
          educations: a.educations.map((e) => ({
            school: e.school,
            qualification: e.qualification,
            field: e.field ?? "",
            startYear: e.startYear?.toString() ?? "",
            endYear: e.endYear?.toString() ?? "",
          })),
        }}
        saveAction={updateProfile}
        draftFromCvAction={draftProfileFromCv}
      />
    </div>
  );
}
