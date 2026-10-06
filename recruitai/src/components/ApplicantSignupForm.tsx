"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { applicantLoginAction } from "@/app/apply-login/actions";

export interface SignupPrefill {
  name: string;
  email: string;
  phone: string;
  // Status token of the application they just made without an account —
  // lets the new account adopt that application and its CV.
  fromToken: string;
}

export default function ApplicantSignupForm({ prefill }: { prefill?: SignupPrefill }) {
  const [name, setName] = useState(prefill?.name ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await fetch("/api/applicant-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          fromToken: prefill?.fromToken,
          phone: formData.get("phone") || undefined,
          headline: formData.get("headline") || undefined,
          skills: formData.get("skills") || undefined,
          seniority: formData.get("seniority") || undefined,
          linkedinUrl: formData.get("linkedinUrl") || undefined,
          portfolioUrl: formData.get("portfolioUrl") || undefined,
          location: formData.get("location") || undefined,
          desiredTitle: formData.get("desiredTitle") || undefined,
          yearsOfExperience: formData.get("yearsOfExperience") || undefined,
          workAuthorization: formData.get("workAuthorization") || undefined,
          remotePreference: formData.get("remotePreference") || undefined,
          noticePeriod: formData.get("noticePeriod") || undefined,
          salaryExpectation: formData.get("salaryExpectation") || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      const loginFormData = new FormData();
      loginFormData.set("email", email);
      loginFormData.set("password", password);
      loginFormData.set("callbackUrl", prefill ? "/my" : "/jobs");

      try {
        await applicantLoginAction(loginFormData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Account created — please sign in."
        );
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-violet-50 via-white to-blue-50">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight text-zinc-900">
            RecruitAI
          </Link>
          <p className="mt-1 text-sm text-zinc-500">
            {prefill
              ? "Set a password and your CV and details are saved — next time it's one click."
              : "Create an account to track your applications"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-4"
        >
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Full name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              placeholder="••••••••"
            />
          </div>

          <details className="group">
            <summary className="text-sm font-medium text-violet-700 cursor-pointer list-none flex items-center gap-1">
              <span className="transition-transform group-open:rotate-90">▸</span>
              Tell us about yourself{" "}
              <span className="text-zinc-400 font-normal">(optional, helps recruiters)</span>
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Headline
                </label>
                <input
                  name="headline"
                  disabled={pending}
                  placeholder="e.g. Senior Product Designer"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">Phone</label>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={prefill?.phone}
                    disabled={pending}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Experience level
                  </label>
                  <select
                    name="seniority"
                    defaultValue=""
                    disabled={pending}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="ENTRY">Entry-level</option>
                    <option value="MID">Mid-level</option>
                    <option value="SENIOR">Senior</option>
                    <option value="LEAD">Lead</option>
                    <option value="EXECUTIVE">Executive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Skills <span className="text-zinc-400 font-normal">(comma-separated)</span>
                </label>
                <input
                  name="skills"
                  disabled={pending}
                  placeholder="e.g. Figma, React, SQL"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    LinkedIn
                  </label>
                  <input
                    name="linkedinUrl"
                    disabled={pending}
                    placeholder="https://linkedin.com/in/…"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Portfolio
                  </label>
                  <input
                    name="portfolioUrl"
                    disabled={pending}
                    placeholder="https://…"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Location
                  </label>
                  <input
                    name="location"
                    disabled={pending}
                    placeholder="e.g. Dubai, UAE"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Years of experience
                  </label>
                  <input
                    name="yearsOfExperience"
                    type="number"
                    min={0}
                    disabled={pending}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Desired job title
                </label>
                <input
                  name="desiredTitle"
                  disabled={pending}
                  placeholder="What role are you looking for?"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Remote preference
                  </label>
                  <select
                    name="remotePreference"
                    defaultValue=""
                    disabled={pending}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="REMOTE_ONLY">Remote only</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ON_SITE">On-site</option>
                    <option value="FLEXIBLE">Flexible</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Notice period
                  </label>
                  <select
                    name="noticePeriod"
                    defaultValue=""
                    disabled={pending}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="IMMEDIATE">Immediately available</option>
                    <option value="TWO_WEEKS">2 weeks</option>
                    <option value="ONE_MONTH">1 month</option>
                    <option value="MORE_THAN_ONE_MONTH">More than 1 month</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Work authorization
                  </label>
                  <select
                    name="workAuthorization"
                    defaultValue=""
                    disabled={pending}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="AUTHORIZED">Authorized, no sponsorship needed</option>
                    <option value="REQUIRES_SPONSORSHIP">Requires visa sponsorship</option>
                    <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1">
                    Salary expectation
                  </label>
                  <input
                    name="salaryExpectation"
                    disabled={pending}
                    placeholder="e.g. $90k–110k"
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  />
                </div>
              </div>
            </div>
          </details>

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-violet-600 text-white text-sm font-medium rounded-md py-2 hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/apply-login" className="text-violet-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-zinc-400">
          <Link href="/jobs" className="hover:text-zinc-600 hover:underline">
            ← Back to open roles
          </Link>
        </p>
      </div>
    </div>
  );
}
