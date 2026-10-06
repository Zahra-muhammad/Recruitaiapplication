import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/components/ProfileForm";
import { updateProfile } from "./actions";

export default async function ProfilePage() {
  const session = await applicantAuth();
  const sessionUser = session?.user as { id: string; email?: string | null } | undefined;
  if (!sessionUser) return null;

  const applicant = await prisma.applicant.findUnique({ where: { id: sessionUser.id } });
  if (!applicant) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900">Your profile</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {applicant.email} · Save your details once and reuse them to apply faster.
        </p>
      </div>

      <ProfileForm
        defaults={{
          name: applicant.name,
          phone: applicant.phone ?? "",
          headline: applicant.headline ?? "",
          skills: applicant.skills ?? "",
          linkedinUrl: applicant.linkedinUrl ?? "",
          portfolioUrl: applicant.portfolioUrl ?? "",
          seniority: applicant.seniority ?? "",
          location: applicant.location ?? "",
          desiredTitle: applicant.desiredTitle ?? "",
          yearsOfExperience: applicant.yearsOfExperience?.toString() ?? "",
          workAuthorization: applicant.workAuthorization ?? "",
          remotePreference: applicant.remotePreference ?? "",
          noticePeriod: applicant.noticePeriod ?? "",
          salaryExpectation: applicant.salaryExpectation ?? "",
          savedCoverNote: applicant.savedCoverNote ?? "",
          hasSavedCv: !!applicant.savedCvFileUrl,
        }}
        updateProfileAction={updateProfile}
      />
    </div>
  );
}
