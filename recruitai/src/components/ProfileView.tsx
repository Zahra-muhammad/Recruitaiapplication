import type { ReactNode } from "react";
import { cityByKey, cityLabel } from "@/lib/cities";
import { dateRange, type FullProfile } from "@/lib/applicantProfile";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-zinc-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-zinc-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}

// LinkedIn-style profile. `audience="recruiter"` hides contact details,
// links to the CV and private preferences — recruiters only get those once
// the candidate applies.
export default function ProfileView({
  profile,
  audience,
  actions,
}: {
  profile: FullProfile;
  audience: "self" | "recruiter";
  actions?: ReactNode;
}) {
  const city = cityByKey(profile.city);
  const place = city ? cityLabel(city) : profile.location;
  const skills = (profile.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const isSelf = audience === "self";

  return (
    <div className="space-y-4">
      <section className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <div className="px-6 pb-6">
          <div className="-mt-10 h-20 w-20 rounded-full bg-white p-1 shadow">
            <div className="h-full w-full rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-semibold">
              {initials(profile.name)}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">{profile.name}</h1>
              {profile.headline && <p className="text-sm text-zinc-700 mt-0.5">{profile.headline}</p>}
              <p className="text-sm text-zinc-500 mt-1">
                {[place, isSelf ? profile.email : null, isSelf ? profile.phone : null].filter(Boolean).join(" · ")}
              </p>
              {(profile.linkedinUrl || profile.portfolioUrl) && (
                <div className="flex gap-3 mt-2 text-sm">
                  {profile.linkedinUrl && (
                    <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-700 hover:underline">
                      LinkedIn
                    </a>
                  )}
                  {profile.portfolioUrl && (
                    <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-700 hover:underline">
                      Portfolio
                    </a>
                  )}
                </div>
              )}
              {profile.openToWork && (
                <span className="inline-block mt-3 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                  Open to work
                </span>
              )}
            </div>
            {actions}
          </div>
        </div>
      </section>

      {profile.about && (
        <Card title="About">
          <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">{profile.about}</p>
        </Card>
      )}

      {profile.experiences.length > 0 && (
        <Card title="Experience">
          <ol className="space-y-5">
            {profile.experiences.map((e) => (
              <li key={e.id} className="flex gap-3">
                <div className="mt-1 h-9 w-9 shrink-0 rounded-md bg-zinc-100 text-zinc-500 flex items-center justify-center text-xs font-semibold">
                  {initials(e.company)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{e.title}</p>
                  <p className="text-sm text-zinc-700">{e.company}</p>
                  <p className="text-xs text-zinc-500">
                    {dateRange(e.startDate, e.endDate)}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                  {e.description && <p className="text-sm text-zinc-700 mt-1.5 whitespace-pre-wrap">{e.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {profile.educations.length > 0 && (
        <Card title="Education">
          <ul className="space-y-3">
            {profile.educations.map((ed) => (
              <li key={ed.id}>
                <p className="text-sm font-semibold text-zinc-900">{ed.school}</p>
                <p className="text-sm text-zinc-700">
                  {ed.qualification}
                  {ed.field ? `, ${ed.field}` : ""}
                </p>
                {(ed.startYear || ed.endYear) && (
                  <p className="text-xs text-zinc-500">{[ed.startYear, ed.endYear].filter(Boolean).join(" – ")}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(skills.length > 0 || profile.languages) && (
        <Card title="Skills & languages">
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="text-xs font-medium text-zinc-700 bg-zinc-100 rounded-full px-2.5 py-1">
                  {s}
                </span>
              ))}
            </div>
          )}
          {profile.languages && <p className="text-sm text-zinc-700 mt-3">Languages: {profile.languages}</p>}
        </Card>
      )}
    </div>
  );
}
