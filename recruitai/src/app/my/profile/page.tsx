import Link from "next/link";
import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";
import ProfileView from "@/components/ProfileView";
import { missingProfileParts } from "@/lib/applicantProfile";

export default async function ProfilePage() {
  const session = await applicantAuth();
  const sessionUser = session?.user as { id: string } | undefined;
  if (!sessionUser) return null;

  const profile = await prisma.applicant.findUnique({
    where: { id: sessionUser.id },
    include: {
      experiences: { orderBy: { sortOrder: "asc" } },
      educations: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!profile) return null;

  const missing = missingProfileParts(profile);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
      {missing.length > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-950">Finish your profile</p>
            <p className="text-xs text-amber-900/80 mt-0.5">Still needed: {missing.join(", ")}.</p>
          </div>
          <Link href="/my/profile/edit" className="bg-blue-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-blue-700">
            Complete profile
          </Link>
        </div>
      ) : (
        !profile.openToWork && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 text-sm text-blue-950">
            Your profile is private. Switch on <span className="font-medium">Open to work</span> in{" "}
            <Link href="/my/profile/edit" className="font-medium underline">
              Edit profile
            </Link>{" "}
            to let recruiters find you and invite you to apply.
          </div>
        )
      )}

      <ProfileView
        profile={profile}
        audience="self"
        actions={
          <Link
            href="/my/profile/edit"
            className="text-sm font-medium rounded-md px-4 py-2 border border-zinc-300 text-zinc-700 hover:border-zinc-400"
          >
            Edit profile
          </Link>
        }
      />
    </div>
  );
}
