"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import VerdictBadge from "./VerdictBadge";
import SourceTag from "./SourceTag";
import ApplicationStatusBadge from "./ApplicationStatusBadge";
import ScoringStatus from "./ScoringStatus";

export interface CandidateRow {
  id: string;
  name: string;
  email: string | null;
  uploadedAt: string;
  scoring: "scored" | "pending" | "failed";
  scoringError: string | null;
  // null until scored — never a placeholder number.
  totalScore: number | null;
  verdict: string | null;
  manualVerdictOverride: string | null;
  flags: string[];
  source: string;
  status: string;
  genericReasons: string[];
  duplicate: { label: string; href: string } | null;
}

const FILTERS = ["ALL", "COMPATIBLE", "BORDERLINE", "NOT_COMPATIBLE"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<Filter, string> = {
  ALL: "All",
  COMPATIBLE: "Compatible",
  BORDERLINE: "Borderline",
  NOT_COMPATIBLE: "Not compatible",
};

const SOURCE_FILTERS = ["ALL", "APPLIED", "RECRUITER_UPLOADED"] as const;
type SourceFilter = (typeof SOURCE_FILTERS)[number];

const SOURCE_FILTER_LABELS: Record<SourceFilter, string> = {
  ALL: "Any source",
  APPLIED: "Applied",
  RECRUITER_UPLOADED: "Uploaded",
};

interface PipelineSearchResult {
  candidateIds: string[];
  interpretation: string[];
}

export default function CandidatesTable({
  candidates,
  jobId,
  searchAction,
  retryAction,
}: {
  candidates: CandidateRow[];
  jobId: string;
  // Natural-language pipeline search, run on the server.
  searchAction?: (query: string) => Promise<PipelineSearchResult>;
  retryAction?: (candidateId: string) => Promise<void>;
}) {
  const [askQuery, setAskQuery] = useState("");
  const [askResult, setAskResult] = useState<{ ids: Set<string>; interpretation: string[] } | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [asking, startAsking] = useTransition();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return candidates.filter((c) => {
      if (askResult && !askResult.ids.has(c.id)) return false;
      const effectiveVerdict = c.manualVerdictOverride ?? c.verdict;
      if (filter !== "ALL" && effectiveVerdict !== filter) return false;
      if (sourceFilter !== "ALL" && c.source !== sourceFilter) return false;
      if (minScore > 0 && (c.totalScore ?? -1) < minScore) return false;
      if (q && !`${c.name} ${c.email ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [candidates, filter, sourceFilter, search, minScore, askResult]);

  function handleAsk(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!searchAction || !askQuery.trim()) return;
    setAskError(null);
    startAsking(async () => {
      try {
        const result = await searchAction(askQuery);
        setAskResult({ ids: new Set(result.candidateIds), interpretation: result.interpretation });
      } catch (err) {
        setAskError(err instanceof Error ? err.message : "Search failed.");
      }
    });
  }

  function clearAsk() {
    setAskQuery("");
    setAskResult(null);
    setAskError(null);
  }

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { ALL: candidates.length, COMPATIBLE: 0, BORDERLINE: 0, NOT_COMPATIBLE: 0 };
    for (const cand of candidates) {
      const v = (cand.manualVerdictOverride ?? cand.verdict) as Filter | null;
      if (v && v in c) c[v]++;
    }
    return c;
  }, [candidates]);

  const hasActiveFilters = filter !== "ALL" || sourceFilter !== "ALL" || search !== "" || minScore > 0;

  function clearFilters() {
    setFilter("ALL");
    setSourceFilter("ALL");
    setSearch("");
    setMinScore(0);
  }

  if (candidates.length === 0) {
    return (
      <div className="border border-dashed border-zinc-300 rounded-xl p-10 text-center text-sm text-zinc-500">
        No candidates yet. Upload CVs above to get ranked results.
      </div>
    );
  }

  return (
    <div>
      {searchAction && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-3">
          <form onSubmit={handleAsk} className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={askQuery}
              onChange={(e) => setAskQuery(e.target.value)}
              placeholder='Ask about this pipeline — e.g. "startup experience and scored above 60"'
              aria-label="Ask about this pipeline"
              maxLength={300}
              className="flex-1 min-w-[240px] rounded-md border border-violet-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
            <button
              type="submit"
              disabled={asking || !askQuery.trim()}
              className="bg-violet-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {asking ? "Searching…" : "Search"}
            </button>
            {askResult && (
              <button type="button" onClick={clearAsk} className="text-xs font-medium text-violet-700 hover:underline">
                Clear
              </button>
            )}
          </form>
          {askError && <p className="text-xs text-red-600 mt-2">{askError}</p>}
          {askResult && (
            <p className="text-xs text-violet-900 mt-2">
              <span className="font-medium">
                {askResult.ids.size} match{askResult.ids.size === 1 ? "" : "es"}
              </span>{" "}
              — understood as: {askResult.interpretation.join(" · ")}
            </p>
          )}
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-3 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1 min-w-[180px] rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
            className="rounded-md border border-zinc-300 px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          >
            {SOURCE_FILTERS.map((s) => (
              <option key={s} value={s}>
                {SOURCE_FILTER_LABELS[s]}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 text-xs text-zinc-500 min-w-[200px]">
            <span className="whitespace-nowrap">Min score: {minScore}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="flex-1 accent-indigo-600"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 hover:underline whitespace-nowrap"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
                filter === f
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
              }`}
            >
              {FILTER_LABELS[f]} · {counts[f]}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-zinc-400 mb-2">
        Showing {filtered.length} of {candidates.length} candidate{candidates.length === 1 ? "" : "s"}
      </p>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-zinc-300 rounded-xl p-10 text-center text-sm text-zinc-500">
          No candidates match these filters.
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 font-medium">Rank</th>
                <th className="px-4 py-2.5 font-medium">Candidate</th>
                <th className="px-4 py-2.5 font-medium">Score</th>
                <th className="px-4 py-2.5 font-medium">Verdict</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Source</th>
                <th className="px-4 py-2.5 font-medium">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const effectiveVerdict = c.manualVerdictOverride ?? c.verdict;
                const scored = c.totalScore !== null && effectiveVerdict !== null;
                return (
                  <tr key={c.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{scored ? i + 1 : "—"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/${jobId}/candidates/${c.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.email && <div className="text-xs text-zinc-400">{c.email}</div>}
                      {c.genericReasons.length > 0 && (
                        <span
                          title={`${c.genericReasons.join(" ")} This is only a hint to read closely — it never affects the score.`}
                          className="inline-block mt-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 cursor-help"
                        >
                          Possibly generic application
                        </span>
                      )}
                      {c.flags.map((f) => (
                        <span
                          key={f}
                          className="inline-block mt-1 mr-1 text-[10px] font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5"
                        >
                          Flagged: {f}
                        </span>
                      ))}
                      {c.duplicate && (
                        <Link
                          href={c.duplicate.href}
                          title={`${c.duplicate.label}. Informational only — never used to reject.`}
                          className="inline-block mt-1 ml-1 text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5 hover:border-rose-300"
                        >
                          Possible duplicate application
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {scored ? (
                        <>
                          <span className="font-semibold text-zinc-900">{c.totalScore}</span>
                          <span className="text-zinc-400">/100</span>
                        </>
                      ) : (
                        <span title={c.scoringError ?? undefined}>
                          <ScoringStatus
                            state={c.scoring === "pending" ? "pending" : "failed"}
                            retryAction={retryAction ? () => retryAction(c.id) : undefined}
                            compact
                          />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {scored && <VerdictBadge verdict={effectiveVerdict} />}
                        {c.manualVerdictOverride && (
                          <span className="text-[10px] text-zinc-400" title="Manually overridden">
                            (edited)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ApplicationStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3">
                      <SourceTag source={c.source} />
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{c.uploadedAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
