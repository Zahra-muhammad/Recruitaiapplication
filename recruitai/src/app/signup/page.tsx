"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        name,
        email,
        password,
        industry: formData.get("industry") || undefined,
        website: formData.get("website") || undefined,
        size: formData.get("size") || undefined,
        about: formData.get("about") || undefined,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (signInRes?.error) {
      setError("Account created, but sign in failed. Try logging in.");
      router.push("/login");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            RecruitAI
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Set up your company&apos;s recruiting workspace
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
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Company name
            </label>
            <input
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              placeholder="Acme Inc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Your name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              placeholder="At least 8 characters"
            />
          </div>

          <details className="group">
            <summary className="text-sm font-medium text-indigo-700 cursor-pointer list-none flex items-center gap-1">
              <span className="transition-transform group-open:rotate-90">▸</span>
              Tell us about your company{" "}
              <span className="text-zinc-400 font-normal">(optional, helps candidates)</span>
            </summary>
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Industry</label>
                <input
                  name="industry"
                  placeholder="e.g. Fintech, Healthcare, SaaS"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Website</label>
                <input
                  name="website"
                  placeholder="https://acme.com"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">Company size</label>
                <select
                  name="size"
                  defaultValue=""
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                >
                  <option value="">Prefer not to say</option>
                  <option value="SIZE_1_10">1–10</option>
                  <option value="SIZE_11_50">11–50</option>
                  <option value="SIZE_51_200">51–200</option>
                  <option value="SIZE_201_1000">201–1,000</option>
                  <option value="SIZE_1000_PLUS">1,000+</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">About</label>
                <textarea
                  name="about"
                  rows={3}
                  placeholder="A couple sentences applicants will see on your careers page."
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>
            </div>
          </details>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white text-sm font-medium rounded-md py-2 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating workspace…" : "Create workspace"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="text-indigo-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
