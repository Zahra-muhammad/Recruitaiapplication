"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ScoreTalentButton({
  count,
  scoreAction,
}: {
  count: number;
  scoreAction: () => Promise<{ scored: number; failed: number }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMessage(null);
            const res = await scoreAction().catch(() => ({ scored: 0, failed: count }));
            setMessage(res.failed ? `${res.scored} scored, ${res.failed} couldn't be scored — try again.` : null);
            router.refresh();
          })
        }
        className="bg-indigo-600 text-white text-sm font-medium rounded-md px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? `Scoring ${count}… (about a minute)` : `Score the next ${count} candidate${count === 1 ? "" : "s"}`}
      </button>
      <span className="text-xs text-zinc-500">{message ?? `Uses AI — about ${count * 5}–${count * 10} cents.`}</span>
    </div>
  );
}

export function InviteButton({
  invited,
  applied,
  inviteAction,
}: {
  invited: boolean;
  applied: boolean;
  inviteAction: () => Promise<{ ok: true } | { error: string }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(invited);

  if (applied) return <span className="text-xs font-medium text-emerald-700">Applied</span>;
  if (done) return <span className="text-xs font-medium text-zinc-500">Invited ✓</span>;
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await inviteAction().catch(() => ({ error: "Couldn't send the invite." }));
            if ("error" in res) setError(res.error);
            else {
              setDone(true);
              router.refresh();
            }
          })
        }
        className="text-sm font-medium rounded-md px-3 py-1.5 border border-indigo-300 text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
      >
        {pending ? "Inviting…" : "Invite to apply"}
      </button>
      {error && <span className="text-[11px] text-red-600 mt-1">{error}</span>}
    </span>
  );
}
