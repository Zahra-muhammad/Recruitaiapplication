import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import SignOutButton from "./SignOutButton";
import NotificationBell, { type NotificationItem } from "./NotificationBell";
import SettingsMenu from "./SettingsMenu";
import { markCompanyNotificationsRead } from "@/lib/notificationActions";

export default async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  const [company, notificationRows] = await Promise.all([
    prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    }),
    prisma.notification.findMany({
      where: { companyId: session.user.companyId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
  ]);

  const notifications: NotificationItem[] = notificationRows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt.toLocaleString(),
  }));

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-semibold text-zinc-900 tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            RecruitAI
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-zinc-600 hover:text-indigo-700 transition-colors">
              Dashboard
            </Link>
            {session.user.role === "admin" && (
              <Link href="/team" className="text-zinc-600 hover:text-indigo-700 transition-colors">
                Team
              </Link>
            )}
            <Link href="/jobs" target="_blank" className="text-zinc-600 hover:text-indigo-700 transition-colors">
              Careers page
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <SettingsMenu />
          <NotificationBell notifications={notifications} markReadAction={markCompanyNotificationsRead} />
          <div className="text-right leading-tight hidden sm:block">
            <div className="text-sm font-medium text-zinc-900">{session.user.name}</div>
            <div className="text-xs text-zinc-500">
              {company?.name} · <span className="text-indigo-600 font-medium">{session.user.role}</span>
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
