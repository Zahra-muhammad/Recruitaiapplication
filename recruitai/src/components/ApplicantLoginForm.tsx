"use client";

import { useState, useTransition, type FormEvent } from "react";
import { applicantLoginAction } from "@/app/apply-login/actions";

export default function ApplicantLoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await applicantLoginAction(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4"
    >
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
        <input
          type="email"
          name="email"
          required
          disabled={pending}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
        <input
          type="password"
          name="password"
          required
          disabled={pending}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-violet-600 text-white text-sm font-medium rounded-md py-2 hover:bg-violet-700 transition-colors disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
