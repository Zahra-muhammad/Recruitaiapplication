"use client";

import { useState } from "react";
import Link from "next/link";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell({
  notifications,
  markReadAction,
  buttonClassName = "text-zinc-600 hover:bg-zinc-100",
  linkClassName = "text-indigo-700",
}: {
  notifications: NotificationItem[];
  markReadAction: () => Promise<void>;
  buttonClassName?: string;
  linkClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30 ${buttonClassName}`}
        aria-label="Notifications"
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold text-white flex items-center justify-center bg-fuchsia-500">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-zinc-200 rounded-xl shadow-xl z-40">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <span className="text-sm font-semibold text-zinc-900">Notifications</span>
              {unreadCount > 0 && (
                <form action={markReadAction}>
                  <button type="submit" className={`text-xs font-medium ${linkClassName} hover:underline`}>
                    Mark all read
                  </button>
                </form>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-400">You&apos;re all caught up.</p>
            ) : (
              <div className="divide-y divide-zinc-100">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 hover:bg-zinc-50 transition-colors ${
                      n.read ? "" : "bg-indigo-50/40"
                    }`}
                  >
                    <p className="text-sm font-medium text-zinc-900">{n.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{n.body}</p>
                    <p className="text-[11px] text-zinc-400 mt-1">{n.createdAt}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
