"use client";

import Link from "next/link";
import SettingsMenu from "@/components/SettingsMenu";
import GradientMesh from "@/components/motion/GradientMesh";
import KineticText from "@/components/motion/KineticText";
import RevealOnScroll from "@/components/motion/RevealOnScroll";
import TiltCard from "@/components/motion/TiltCard";
import CountUp from "@/components/motion/CountUp";

interface Recruiter {
  name: string;
  companyName: string | null;
}

interface Stats {
  openJobsCount: number;
  companiesCount: number;
  candidatesScored: number;
}

const FEATURES = [
  { emoji: "🎯", label: "Automatic scoring", color: "text-emerald-600 bg-emerald-50" },
  { emoji: "🔒", label: "Company isolation", color: "text-violet-600 bg-violet-50" },
  { emoji: "✅", label: "Check your own fit", color: "text-blue-600 bg-blue-50" },
  { emoji: "📋", label: "Track applications", color: "text-amber-600 bg-amber-50" },
  { emoji: "💬", label: "Recruiter messaging", color: "text-indigo-600 bg-indigo-50" },
  { emoji: "🔔", label: "Saved search alerts", color: "text-fuchsia-600 bg-fuchsia-50" },
];

export default function LandingPage({
  recruiter,
  applicantName,
  stats,
}: {
  recruiter: Recruiter | null;
  applicantName: string | null;
  stats: Stats;
}) {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <div className="absolute top-4 right-4 z-20">
        <SettingsMenu />
      </div>
      {/* HERO */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 bg-gradient-to-br from-indigo-50 via-white to-violet-50">
        <GradientMesh />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <span className="inline-block text-xs font-medium tracking-wide uppercase text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-6 animate-[fadeIn_0.8s_ease-out]">
            AI-assisted hiring, kept honest
          </span>

          <KineticText
            text="RecruitAI"
            as="h1"
            className="text-6xl sm:text-8xl font-semibold tracking-tight text-zinc-900 bg-clip-text"
          />

          <KineticText
            text="Choose how you'd like to get started."
            as="p"
            delay={0.4}
            className="mt-5 text-lg text-zinc-500 max-w-md mx-auto"
          />
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-400 animate-bounce">
          <span className="text-xs uppercase tracking-wide">Scroll</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 5L8 11L14 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* OPTION CARDS */}
      <section className="relative px-4 py-20 max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-2 gap-6">
          <RevealOnScroll delay={0}>
            <TiltCard className="bg-white border border-zinc-200 rounded-2xl p-7 shadow-sm hover:shadow-xl transition-shadow h-full">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center text-xl font-semibold mb-5 shadow-lg shadow-blue-500/30">
                🔍
              </div>
              <h2 className="text-xl font-semibold text-zinc-900">Looking for a job?</h2>
              <p className="text-sm text-zinc-500 mt-2">
                Search open roles, check your fit, and apply — no account needed.
              </p>
              <div className="mt-6 space-y-2">
                <Link
                  href="/jobs"
                  className="block text-center bg-blue-600 text-white text-sm font-medium rounded-md px-4 py-3 hover:bg-blue-700 transition-colors"
                >
                  Browse for jobs
                </Link>
                {!applicantName && (
                  <div className="flex items-center justify-center gap-3 pt-1 text-xs">
                    <Link
                      href="/apply-signup"
                      className="font-medium text-blue-700 hover:underline"
                    >
                      Create an account
                    </Link>
                    <span className="text-zinc-300">·</span>
                    <Link href="/apply-login" className="font-medium text-blue-700 hover:underline">
                      Sign in
                    </Link>
                  </div>
                )}
              </div>
            </TiltCard>
          </RevealOnScroll>

          <RevealOnScroll delay={0.15}>
            <TiltCard className="bg-white border border-zinc-200 rounded-2xl p-7 shadow-sm hover:shadow-xl transition-shadow h-full">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center text-xl font-semibold mb-5 shadow-lg shadow-violet-500/30">
                🏢
              </div>
              <h2 className="text-xl font-semibold text-zinc-900">Hiring?</h2>
              <p className="text-sm text-zinc-500 mt-2">
                Post roles, get candidates ranked automatically, and review the ones that fit.
              </p>
              <div className="mt-6 space-y-2">
                {recruiter ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="block text-center bg-indigo-600 text-white text-sm font-medium rounded-md px-4 py-3 hover:bg-indigo-700 transition-colors"
                    >
                      Go to dashboard
                    </Link>
                    <p className="text-center text-xs text-zinc-400 py-1">
                      Signed in as {recruiter.name}
                      {recruiter.companyName && ` · ${recruiter.companyName}`}
                    </p>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="block text-center bg-indigo-600 text-white text-sm font-medium rounded-md px-4 py-3 hover:bg-indigo-700 transition-colors"
                    >
                      Recruiter sign in
                    </Link>
                    <Link
                      href="/signup"
                      className="block text-center text-sm font-medium text-indigo-700 hover:underline py-1"
                    >
                      New company? Create a workspace →
                    </Link>
                  </>
                )}
              </div>
            </TiltCard>
          </RevealOnScroll>
        </div>
      </section>

      {/* LIVE STATS */}
      <section className="relative px-4 py-16 bg-gradient-to-br from-indigo-950 via-violet-950 to-indigo-900 text-white">
        <div className="max-w-5xl mx-auto">
          <RevealOnScroll>
            <h2 className="text-center text-sm uppercase tracking-widest text-indigo-300 mb-10">
              Right now on RecruitAI
            </h2>
          </RevealOnScroll>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              { value: stats.openJobsCount, label: "Open roles", color: "text-blue-300" },
              { value: stats.companiesCount, label: "Companies hiring", color: "text-violet-300" },
              { value: stats.candidatesScored, label: "Candidates scored", color: "text-fuchsia-300" },
            ].map((s, i) => (
              <RevealOnScroll key={s.label} delay={i * 0.12}>
                <div>
                  <div className={`text-5xl font-semibold ${s.color}`}>
                    <CountUp value={s.value} />
                  </div>
                  <p className="mt-2 text-sm text-indigo-200">{s.label}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative px-4 py-20 max-w-5xl mx-auto">
        <RevealOnScroll>
          <h2 className="text-center text-2xl font-semibold text-zinc-900 mb-10">
            Built for both sides of the table
          </h2>
        </RevealOnScroll>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <RevealOnScroll key={f.label} delay={i * 0.06}>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center h-full hover:border-zinc-300 hover:shadow-md transition-all">
                <div
                  className={`w-9 h-9 rounded-lg mx-auto flex items-center justify-center text-base mb-3 ${f.color}`}
                >
                  {f.emoji}
                </div>
                <p className="text-xs text-zinc-600 font-medium">{f.label}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>
    </div>
  );
}
