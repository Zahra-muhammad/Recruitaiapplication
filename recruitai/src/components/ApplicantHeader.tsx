import Link from "next/link";
import NotificationBell, { type NotificationItem } from "@/components/NotificationBell";
import SettingsMenu from "@/components/SettingsMenu";
import { markApplicantNotificationsRead } from "@/lib/notificationActions";
import { applicantSignOutAction } from "@/app/my/actions";

// Single shared header for every applicant-facing page (both the public
// /jobs pages and the signed-in /my/* pages) — identical width, colors,
// link order, and logo everywhere, so navigating between them never shifts
// the chrome around you.
export default function ApplicantHeader({
  user,
  notifications,
}: {
  user: { name?: string | null } | null;
  notifications: NotificationItem[];
}) {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href="/jobs"
            className="font-semibold text-zinc-900 tracking-tight flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            RecruitAI Careers
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/jobs" className="text-zinc-600 hover:text-blue-700 transition-colors">
              Browse jobs
            </Link>
            {user && (
              <>
                <Link href="/my" className="text-zinc-600 hover:text-blue-700 transition-colors">
                  My applications
                </Link>
                <Link
                  href="/my/saved-searches"
                  className="text-zinc-600 hover:text-blue-700 transition-colors"
                >
                  Saved searches
                </Link>
                <Link
                  href="/my/profile"
                  className="text-zinc-600 hover:text-blue-700 transition-colors"
                >
                  Profile
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <SettingsMenu />
          {user ? (
            <>
              <NotificationBell
                notifications={notifications}
                markReadAction={markApplicantNotificationsRead}
                linkClassName="text-blue-700"
              />
              {user.name && (
                <span className="text-sm text-zinc-500 hidden sm:inline">{user.name}</span>
              )}
              <form action={applicantSignOutAction}>
                <button
                  type="submit"
                  className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/status"
                className="text-sm text-zinc-600 hover:text-blue-700 transition-colors hidden sm:inline"
              >
                Check status
              </Link>
              <Link
                href="/apply-login"
                className="text-sm text-zinc-600 hover:text-blue-700 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/apply-signup"
                className="text-sm font-medium bg-blue-600 text-white rounded-md px-3 py-1.5 hover:bg-blue-700 transition-colors"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
