"use client";

import { useMemo, useState, useTransition, type FormEvent, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SENIORITY_LABELS } from "@/lib/seniority";
import StaggerReveal from "@/components/motion/StaggerReveal";
import SaveJobButton from "@/components/SaveJobButton";

export interface PublicJobListing {
  id: string;
  title: string;
  description: string;
  companyName: string;
  location: string;
  seniority: string;
  salary: string | null;
  verifiedLabel: string;
  skills: string[];
}

export default function JobSearch({
  jobs,
  isApplicantSignedIn = false,
  savedJobIds = [],
  saveSearchAction,
  toggleSavedJobAction,
}: {
  jobs: PublicJobListing[];
  isApplicantSignedIn?: boolean;
  savedJobIds?: string[];
  saveSearchAction?: (formData: FormData) => Promise<void>;
  toggleSavedJobAction?: (jobId: string) => Promise<{ saved: boolean }>;
}) {
  const router = useRouter();
  const savedSet = useMemo(() => new Set(savedJobIds), [savedJobIds]);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("ALL");
  const [seniority, setSeniority] = useState("ALL");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [savingSearch, setSavingSearch] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [saveDone, setSaveDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const locations = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.location))).sort(),
    [jobs]
  );

  const seniorities = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.seniority))),
    [jobs]
  );

  const allSkills = useMemo(() => {
    const set = new Set<string>();
    for (const job of jobs) {
      for (const skill of job.skills) set.add(skill);
    }
    return Array.from(set).sort();
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (q && !`${job.title} ${job.description}`.toLowerCase().includes(q)) return false;
      if (location !== "ALL" && job.location !== location) return false;
      if (seniority !== "ALL" && job.seniority !== seniority) return false;
      if (selectedSkills.length > 0 && !selectedSkills.some((s) => job.skills.includes(s))) {
        return false;
      }
      return true;
    });
  }, [jobs, query, location, seniority, selectedSkills]);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function clearFilters() {
    setQuery("");
    setLocation("ALL");
    setSeniority("ALL");
    setSelectedSkills([]);
  }

  const hasActiveFilters =
    query !== "" || location !== "ALL" || seniority !== "ALL" || selectedSkills.length > 0;

  function handleSaveSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!saveSearchAction || !saveLabel.trim()) return;

    const formData = new FormData();
    formData.set("label", saveLabel.trim());
    if (query) formData.set("query", query);
    if (location !== "ALL") formData.set("location", location);
    if (seniority !== "ALL") formData.set("seniority", seniority);
    if (selectedSkills[0]) formData.set("skill", selectedSkills[0]);

    startTransition(async () => {
      await saveSearchAction(formData);
      setSaveDone(true);
      setSavingSearch(false);
      setSaveLabel("");
    });
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search job title or description…"
        className="w-full rounded-md border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-5">
          <div>
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
              Location
            </h3>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
            >
              <option value="ALL">All locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
              Seniority
            </h3>
            <select
              value={seniority}
              onChange={(e) => setSeniority(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
            >
              <option value="ALL">All levels</option>
              {seniorities.map((s) => (
                <option key={s} value={s}>
                  {SENIORITY_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>

          {allSkills.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {allSkills.map((skill) => {
                  const active = selectedSkills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`text-xs rounded-full px-2.5 py-1 border transition-colors ${
                        active
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:underline"
            >
              Clear all filters
            </button>
          )}

          <div className="pt-4 border-t border-zinc-200">
            {isApplicantSignedIn ? (
              saveDone ? (
                <p className="text-xs text-emerald-700 font-medium">
                  ✓ Saved — we&apos;ll flag new matches.
                </p>
              ) : savingSearch ? (
                <form onSubmit={handleSaveSearch} className="space-y-2">
                  <input
                    autoFocus
                    value={saveLabel}
                    onChange={(e) => setSaveLabel(e.target.value)}
                    placeholder="Name this search"
                    className="w-full rounded-md border border-violet-300 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={pending || !saveLabel.trim()}
                      className="text-xs font-medium bg-violet-600 text-white rounded-md px-3 py-1.5 hover:bg-violet-700 transition-colors disabled:opacity-50"
                    >
                      {pending ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSavingSearch(false)}
                      className="text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setSavingSearch(true)}
                  className="text-xs font-medium text-violet-700 hover:underline"
                >
                  💾 Save this search
                </button>
              )
            ) : (
              <Link
                href="/apply-login?callbackUrl=/jobs"
                className="text-xs font-medium text-violet-700 hover:underline"
              >
                Sign in to save this search
              </Link>
            )}
          </div>
        </aside>

        <div>
          <p className="text-xs text-zinc-400 mb-3">
            {filtered.length} of {jobs.length} open role{jobs.length === 1 ? "" : "s"}
          </p>

          {filtered.length === 0 ? (
            <div className="border border-dashed border-zinc-300 rounded-xl p-12 text-center text-sm text-zinc-500">
              No roles match your search. Try clearing a filter.
            </div>
          ) : (
            <StaggerReveal className="grid gap-3" deps={[filtered.map((j) => j.id).join(",")]}>
              {filtered.map((job) => {
                function handleCardClick(e: MouseEvent<HTMLDivElement>) {
                  if ((e.target as HTMLElement).closest("[data-no-navigate]")) return;
                  router.push(`/jobs/${job.id}`);
                }
                return (
                  <div
                    key={job.id}
                    onClick={handleCardClick}
                    className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-medium text-zinc-900">{job.title}</h2>
                      {toggleSavedJobAction && (
                        <span data-no-navigate>
                          <SaveJobButton
                            jobId={job.id}
                            initialSaved={savedSet.has(job.id)}
                            isSignedIn={isApplicantSignedIn}
                            toggleAction={toggleSavedJobAction}
                          />
                        </span>
                      )}
                    </div>
                    {job.salary && (
                      <p className="text-sm font-semibold text-emerald-700 mt-1">{job.salary}</p>
                    )}
                    <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{job.description}</p>
                    <p className="text-xs text-zinc-400 mt-2">
                      {job.companyName} · {job.location} ·{" "}
                      {SENIORITY_LABELS[job.seniority] ?? job.seniority} ·{" "}
                      <span className="text-emerald-600">✓ {job.verifiedLabel}</span>
                    </p>
                  </div>
                );
              })}
            </StaggerReveal>
          )}
        </div>
      </div>
    </div>
  );
}
