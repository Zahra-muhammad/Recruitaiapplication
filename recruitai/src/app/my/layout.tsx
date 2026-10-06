import { applicantAuth } from "@/applicantAuth";
import { prisma } from "@/lib/prisma";
import ApplicantHeader from "@/components/ApplicantHeader";
import { type NotificationItem } from "@/components/NotificationBell";

export default async function ApplicantLayout({ children }: { children: React.ReactNode }) {
  const session = await applicantAuth();
  const user = session?.user as { id: string; name?: string | null } | undefined;

  const notificationRows = user
    ? await prisma.notification.findMany({
        where: { applicantId: user.id },
        orderBy: { createdAt: "desc" },
        take: 15,
      })
    : [];

  const notifications: NotificationItem[] = notificationRows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.read,
    createdAt: n.createdAt.toLocaleString(),
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <ApplicantHeader user={user ?? null} notifications={notifications} />
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}
