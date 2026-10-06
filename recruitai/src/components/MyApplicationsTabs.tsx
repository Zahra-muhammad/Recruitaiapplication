"use client";

import { useState } from "react";
import Link from "next/link";
import ApplicationStatusBadge from "@/components/ApplicationStatusBadge";
import SaveJobButton from "@/components/SaveJobButton";

export interface ApplicationRow {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  location: string;
  appliedAt: string;
  status: string;
  jobOpen: boolean;
}

export interface SavedJobRow {
  jobId: string;
  title: string;
  companyName: string;
  location: string;
  jobOpen: boolean;
}

const TABS = ["applied", "review", "saved"] as const;
type Tab = (typeof TABS)[number];

export default function MyApplicationsTabs({
  applications,
  savedJobs,
  toggleSavedJobAction,
}: {
  applications: ApplicationRow[];
  savedJobs: SavedJobRow[];
  toggleSavedJobAction: (jobId: string) => Promise<{ saved: boolean }>;
}) {
  const [tab, setTab] = useState<Tab>("applied");

  const underReview = applications.filter((a) => a.status === "IN_REVIEW");

  const TAB_LABELS: Record<Tab, string> = {
    applied: `Applied · ${applications.length}`,
    review: `In review · ${underReview.length}`,
    saved: `Saved · ${savedJobs.length}`,
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm font-medium rounded-full px-3.5 py-1.5 border transition-colors ${
              tab === t
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "applied" &&
        (applications.length === 0 ? (
          <EmptyState message="No applications yet." />
        ) : (
          <div className="grid gap-3">
            {applications.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        ))}

      {tab === "review" &&
        (underReview.length === 0 ? (
          <EmptyState message="Nothing currently in review." />
        ) : (
          <div className="grid gap-3">
            {underReview.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </div>
        ))}

      {tab === "saved" &&
        (savedJobs.length === 0 ? (
          <EmptyState message="No saved jobs yet. Save one from the jobs page to see it here." />
        ) : (
          <div className="grid gap-3">
            {savedJobs.map((job) => (
              <div
                key={job.jobId}
                className="bg-white border border-zinc-200 rounded-xl p-5 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  {job.jobOpen ? (
                    <Link
                      href={`/jobs/${job.jobId}`}
                      className="font-medium text-zinc-900 hover:text-blue-700 hover:underline"
                    >
                      {job.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-zinc-900">{job.title}</span>
                  )}
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {job.companyName} · {job.location}
                  </p>
                  {!job.jobOpen && (
                    <p className="text-xs text-zinc-400 mt-1.5">This posting has since closed</p>
                  )}
                </div>
                <div className="shrink-0">
                  <SaveJobButton
                    jobId={job.jobId}
                    initialSaved
                    isSignedIn
                    toggleAction={toggleSavedJobAction}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}

function ApplicationCard({ app }: { app: ApplicationRow }) {
  return (
    <Link
      href={`/my/${app.id}`}
      className="block bg-white border border-zinc-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="font-medium text-zinc-900">{app.jobTitle}</span>
          <p className="text-sm text-zinc-500 mt-0.5">
            {app.companyName} · {app.location}
          </p>
          <p className="text-xs text-zinc-400 mt-1.5">
            Applied {app.appliedAt}
            {!app.jobOpen && " · This posting has since closed"}
          </p>
        </div>
        <div className="shrink-0">
          <ApplicationStatusBadge status={app.status} />
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-zinc-300 rounded-xl p-12 text-center">
      <p className="text-zinc-500 text-sm">{message}</p>
      <Link
        href="/jobs"
        className="inline-block mt-3 text-sm font-medium text-blue-700 hover:underline"
      >
        Browse for jobs →
      </Link>
    </div>
  );
}
