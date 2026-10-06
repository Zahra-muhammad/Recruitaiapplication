"use client";

import { useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";

export default function SaveJobButton({
  jobId,
  initialSaved,
  isSignedIn,
  toggleAction,
  className = "",
}: {
  jobId: string;
  initialSaved: boolean;
  isSignedIn: boolean;
  toggleAction: (jobId: string) => Promise<{ saved: boolean }>;
  className?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  if (!isSignedIn) {
    return (
      <Link
        href="/apply-login"
        onClick={(e) => e.stopPropagation()}
        className={`text-xs text-zinc-400 hover:text-blue-700 hover:underline whitespace-nowrap ${className}`}
      >
        ☆ Sign in to save
      </Link>
    );
  }

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      try {
        const res = await toggleAction(jobId);
        setSaved(res.saved);
      } catch {
        // no-op — leave saved state unchanged if the toggle fails
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-50 ${
        saved ? "text-amber-600 hover:text-amber-700" : "text-zinc-400 hover:text-blue-700"
      } ${className}`}
    >
      {saved ? "★ Saved" : "☆ Save"}
    </button>
  );
}
