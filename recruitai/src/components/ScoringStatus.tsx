"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Shown wherever a score would be when there isn't one yet: "Scoring…"
// (refreshing until it lands) or "Scoring failed – retry". Never a number.
export default function ScoringStatus({
  state,
  error,
  retryAction,
  compact = false,
}: {
  state: "pending" | "failed";
  error?: string | null;
  retryAction?: () => Promise<void>;
  compact?: boolean;
}) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "pending") return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [state, router]);

  if (state === "pending" || retrying) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700">
        <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
        Scoring…
      </span>
    );
  }

  function retry() {
    if (!retryAction) return;
    setRetryError(null);
    startRetry(async () => {
      try {
        await retryAction();
        router.refresh();
      } catch {
        setRetryError("Retry didn't go through — try again.");
      }
    });
  }

  return (
    <span className={compact ? "inline-flex items-center gap-2" : "block"}>
      <span className="text-xs font-medium text-red-700">Scoring failed</span>
      {retryAction && (
        <button
          type="button"
          onClick={retry}
          className="ml-2 text-xs font-medium text-indigo-700 hover:underline"
        >
          – retry
        </button>
      )}
      {!compact && error && <span className="block text-[11px] text-zinc-500 mt-0.5">{error}</span>}
      {retryError && <span className="block text-[11px] text-red-600 mt-0.5">{retryError}</span>}
    </span>
  );
}
