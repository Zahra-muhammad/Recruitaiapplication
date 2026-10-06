"use client";

import { useState, useTransition, type FormEvent } from "react";

interface LookupResult {
  devLinks?: { jobTitle: string; url: string }[];
}

export default function StatusLookupForm({
  lookupAction,
}: {
  lookupAction: (formData: FormData) => Promise<LookupResult>;
}) {
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        setResult(await lookupAction(formData));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  if (result) {
    return (
      <div className="mt-6 space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-md px-4 py-3 text-sm text-emerald-900">
          If there are applications under that email, we&apos;ve sent the links there. Check your inbox.
        </div>
        {result.devLinks && result.devLinks.length > 0 && (
          <div className="border border-dashed border-amber-300 bg-amber-50 rounded-md px-4 py-3 text-xs text-amber-900 space-y-1.5">
            <p className="font-medium">Dev mode — no email provider configured, so here are the links:</p>
            {result.devLinks.map((l) => (
              <a key={l.url} href={l.url} className="block text-blue-700 hover:underline">
                {l.jobTitle}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</div>
      )}
      <input
        type="email"
        name="email"
        required
        placeholder="you@example.com"
        disabled={pending}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-blue-600 text-white text-sm font-medium rounded-md py-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {pending ? "Sending…" : "Email me my status links"}
      </button>
    </form>
  );
}
