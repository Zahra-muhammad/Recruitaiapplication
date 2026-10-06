import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import VerdictBadge from "@/components/VerdictBadge";
import { ScoreTalentButton, InviteButton } from "@/components/TalentActions";
import { searchTalent, isApplicable } from "@/lib/talentSearch";
import { cityFromText } from "@/lib/cities";
import { scoreTalent, inviteToApply } from "./actions";

// "Score candidates" waits for up to 10 AI scores.
export const maxDuration = 300;

const RADII = [10, 25, 50, 100, 250];
const SCORE_BATCH = 10;

const selectClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400";

export default async function TalentPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; radius?: string; show?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;
  const params = await searchParams;

  const jobs = await prisma.job.findMany({
    where: { companyId: session.user.companyId },
    orderBy: [{ status: "desc" }, { createdAt: "desc" }],
  });
  const job = jobs.find((j) => j.id === params.job) ?? null;
  const radius = params.radius && RADII.includes(Number(params.radius)) ? Number(params.radius) : null;
  const showAll = params.show === "all";
  const jobCity = job ? cityFromText(job.location) : null;

  const rows = job ? await searchTalent(job, { radiusKm: jobCity ? radius : null }) : [];
  const unscored = rows.filter((r) => !r.score);
  const visible = showAll ? rows : rows.filter(isApplicable);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Find talent</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Candidates who switched on <span className="font-medium">Open to work</span>, ranked for one of your jobs with the
          same AI scoring as applications. You see their profile — contact details only once they apply.
        </p>
      </div>

      <form className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-zinc-500">
          Job
          <select name="job" defaultValue={job?.id ?? ""} required className={`${selectClass} block mt-1 min-w-[260px]`}>
            <option value="" disabled>
              Choose a job…
            </option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
                {j.status === "CLOSED" ? " (closed)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Distance from the job <span className="font-normal text-zinc-400">(optional)</span>
          <select name="radius" defaultValue={radius ?? ""} className={`${selectClass} block mt-1`}>
            <option value="">Anywhere</option>
            {RADII.map((r) => (
              <option key={r} value={r}>
                Within {r} km
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Show
          <select name="show" defaultValue={showAll ? "all" : ""} className={`${selectClass} block mt-1`}>
            <option value="">Applicable only (score 50+)</option>
            <option value="all">Everyone open to work</option>
          </select>
        </label>
        <button type="submit" className="bg-zinc-900 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-zinc-800">
          Search
        </button>
      </form>

      {jobs.length === 0 && (
        <p className="text-sm text-zinc-500">Post a job first — talent is ranked against a job&apos;s requirements.</p>
      )}

      {job && radius !== null && !jobCity && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          &ldquo;{job.location}&rdquo; isn&apos;t a city we can measure distance from, so the distance filter is off.
        </p>
      )}

      {job && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-600">
              {rows.length} candidate{rows.length === 1 ? "" : "s"} open to work
              {radius !== null && jobCity ? ` within ${radius} km of ${jobCity.name}` : ""} ·{" "}
              {rows.filter(isApplicable).length} applicable · {unscored.length} not scored yet
            </p>
            <ScoreTalentButton
              count={Math.min(SCORE_BATCH, unscored.length)}
              scoreAction={scoreTalent.bind(null, job.id, unscored.slice(0, SCORE_BATCH).map((r) => r.applicantId))}
            />
          </div>

          {visible.length === 0 ? (
            <div className="border border-dashed border-zinc-300 rounded-xl p-10 text-center text-sm text-zinc-500">
              {rows.length === 0
                ? "No open-to-work candidates match these filters yet."
                : unscored.length > 0
                  ? "No applicable candidates among those scored so far — score more above, or show everyone."
                  : "No candidates scored 50 or more for this job."}
            </div>
          ) : (
            <ul className="space-y-3">
              {visible.map((r) => {
                const d = r.score?.details;
                return (
                  <li key={r.applicantId} className="bg-white border border-zinc-200 rounded-xl p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/talent/${r.applicantId}?job=${job.id}`}
                          className="text-base font-semibold text-zinc-900 hover:underline"
                        >
                          {r.name}
                        </Link>
                        <p className="text-sm text-zinc-600">{r.headline}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {r.place ?? "Location not shared"}
                          {r.distanceKm !== null && ` · ${r.distanceKm} km from the job`}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {r.skills.map((s) => (
                            <span key={s} className="text-[11px] text-zinc-600 bg-zinc-100 rounded-full px-2 py-0.5">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {r.score ? (
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-zinc-900">
                              {r.score.totalScore}
                              <span className="text-xs text-zinc-400">/100</span>
                            </span>
                            <VerdictBadge verdict={r.score.verdict} />
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">Not scored yet</span>
                        )}
                        <InviteButton
                          invited={r.invited}
                          applied={r.applied}
                          inviteAction={inviteToApply.bind(null, job.id, r.applicantId)}
                        />
                      </div>
                    </div>
                    {d && (
                      <div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs">
                        <p className="text-emerald-800">
                          <span className="font-medium">Has:</span>{" "}
                          {d.mustHaves.filter((m) => m.demonstrated).map((m) => m.requirement).join("; ") || "—"}
                        </p>
                        <p className="text-red-800">
                          <span className="font-medium">Missing:</span>{" "}
                          {d.mustHaves.filter((m) => !m.demonstrated).map((m) => m.requirement).join("; ") || "nothing"}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
