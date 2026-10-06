import Link from "next/link";
import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";
import { publicJobWhere } from "@/lib/jobVerification";
import { jobMatchesSavedSearch } from "@/lib/savedSearchMatch";
import { SENIORITY_LABELS } from "@/lib/seniority";
import { createSavedSearch, deleteSavedSearch } from "./actions";

export default async function SavedSearchesPage() {
  const session = await applicantAuth();
  const user = session?.user as { id: string } | undefined;
  if (!user) return null;

  const [searches, openJobs] = await Promise.all([
    prisma.savedSearch.findMany({ where: { applicantId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.job.findMany({ where: publicJobWhere() }),
  ]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Saved searches</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Get notified when a new job matches. Save one from the{" "}
          <Link href="/jobs" className="text-blue-700 hover:underline">
            jobs page
          </Link>
          , or create one here.
        </p>
      </div>

      <form action={createSavedSearch} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">New saved search</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Name</label>
            <input
              name="label"
              required
              placeholder="e.g. Remote Senior React roles"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Keyword <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              name="query"
              placeholder="e.g. designer"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Location <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              name="location"
              placeholder="e.g. Remote"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Seniority <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <select
              name="seniority"
              defaultValue=""
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="">Any level</option>
              <option value="ENTRY">Entry-level</option>
              <option value="MID">Mid-level</option>
              <option value="SENIOR">Senior</option>
              <option value="LEAD">Lead</option>
              <option value="EXECUTIVE">Executive</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Skill <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <input
              name="skill"
              placeholder="e.g. React"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-blue-700 transition-colors"
          >
            Save search
          </button>
        </div>
      </form>

      {searches.length === 0 ? (
        <div className="border border-dashed border-zinc-300 rounded-xl p-8 text-center text-sm text-zinc-500">
          No saved searches yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {searches.map((s) => {
            const matchCount = openJobs.filter((j) => jobMatchesSavedSearch(j, s)).length;
            const boundDelete = deleteSavedSearch.bind(null, s.id);
            return (
              <div
                key={s.id}
                className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-zinc-900">{s.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {[
                      s.query,
                      s.location,
                      s.seniority ? SENIORITY_LABELS[s.seniority] : null,
                      s.skill,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Any open role"}
                  </p>
                  <p className="text-xs text-blue-700 mt-1 font-medium">
                    {matchCount} matching open role{matchCount === 1 ? "" : "s"} right now
                  </p>
                </div>
                <form action={boundDelete}>
                  <button type="submit" className="text-xs text-zinc-400 hover:text-red-600 transition-colors">
                    Remove
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
