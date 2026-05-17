"use client";

import Link from "next/link";

export default function NotificationBell({ unreadCount }: { unreadCount: number }) {
  return (
    <Link
      href="/notifications"
      className="relative flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
      title="Известувања"
    >
      <span className="text-base">🔔</span>
      <span>Известувања</span>
      {unreadCount > 0 && (
        <span className="absolute top-1 left-5 min-w-[1.1rem] h-[1.1rem] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
