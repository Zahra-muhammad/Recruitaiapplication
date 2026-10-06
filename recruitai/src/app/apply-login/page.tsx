import Link from "next/link";
import ApplicantLoginForm from "@/components/ApplicantLoginForm";

export default async function ApplicantLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-violet-50 via-white to-blue-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight text-zinc-900">
            RecruitAI
          </Link>
          <p className="mt-1 text-sm text-zinc-500">Sign in to track your applications</p>
        </div>

        <ApplicantLoginForm callbackUrl={callbackUrl} />

        <p className="mt-4 text-center text-sm text-zinc-500">
          New here?{" "}
          <Link href="/apply-signup" className="text-violet-700 font-medium hover:underline">
            Create an account
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
