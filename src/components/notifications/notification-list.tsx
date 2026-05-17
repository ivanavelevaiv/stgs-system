"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  application_id: string | null;
}

export default function NotificationList({
  initialNotifications,
}: {
  initialNotifications: Notification[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function markAsRead(id: string) {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function markAllRead() {
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
        Нема известувања.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {unreadCount} непрочитан{unreadCount === 1 ? "о" : "и"}
          </span>
          <button
            type="button"
            onClick={markAllRead}
            className="text-xs text-primary hover:underline"
          >
            Означи ги сите како прочитани
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`border rounded-lg p-4 space-y-1.5 transition-colors ${
              n.is_read
                ? "border-border bg-card"
                : "border-primary/30 bg-primary/5"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    n.is_read ? "text-foreground" : "text-primary"
                  }`}
                >
                  {!n.is_read && (
                    <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2 align-middle" />
                  )}
                  {n.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {n.application_id && (
                  <Link
                    href={`/applicant/applications/${n.application_id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Прикажи
                  </Link>
                )}
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => markAsRead(n.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ✓
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(n.created_at).toLocaleString("mk-MK")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
