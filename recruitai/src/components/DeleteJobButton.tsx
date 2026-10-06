"use client";

import { useState, useTransition } from "react";

// Two-step delete: the first click explains exactly what will be lost,
// the second deletes. There's no undo.
export default function DeleteJobButton({
  jobTitle,
  candidateCount,
  deleteAction,
}: {
  jobTitle: string;
  candidateCount: number;
  deleteAction: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-medium rounded-md px-3 py-1.5 border border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 transition-colors"
      >
        Delete job
      </button>
    );
  }

  function confirmDelete() {
    setError(null);
    startDelete(async () => {
      try {
        await deleteAction(); // redirects to the dashboard on success
      } catch {
        setError("Couldn't delete this job. Please try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">Delete &ldquo;{jobTitle}&rdquo;?</h2>
        <p className="text-sm text-zinc-600">
          This permanently deletes the job posting
          {candidateCount > 0 && (
            <>
              {" "}and its <span className="font-medium text-zinc-900">{candidateCount} candidate{candidateCount === 1 ? "" : "s"}</span>{" "}
              — their scores, notes, messages and the CVs uploaded for this job
            </>
          )}
          . Applicants will no longer see this application on their status page.
        </p>
        <p className="text-sm text-zinc-600">
          This can&apos;t be undone. To just stop new applications, use <span className="font-medium">Close posting</span> instead.
        </p>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="text-sm font-medium rounded-md px-3 py-2 border border-zinc-300 text-zinc-700 hover:border-zinc-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={deleting}
            className="text-sm font-medium rounded-md px-3 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
