import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import LogoutButton from "@/components/logout-button";
import NotificationBell from "@/components/layout/notification-bell";
import InactivityGuard from "@/components/layout/inactivity-guard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, role, department, title")
    .eq("id", user.id)
    .single();

  // Unread notification count
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  const displayName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : user.email ?? "Корисник";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            STGS — ФИНКИ
          </p>
          <p className="mt-1 text-sm font-medium truncate">{displayName}</p>
          {profile?.title && (
            <p className="text-xs text-muted-foreground truncate">
              {profile.title}
            </p>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {profile?.role === "accounting" ? (
            <NavLink href="/accounting">Сметководство</NavLink>
          ) : profile?.role === "archive" ? (
            <NavLink href="/archive">Архива</NavLink>
          ) : profile?.role === "hr" ? (
            <NavLink href="/hr">Човечки ресурси</NavLink>
          ) : profile?.role === "deanery" ? (
            <>
              <NavLink href="/review">Преглед на апликации</NavLink>
              <NavLink href="/budget">Буџет</NavLink>
            </>
          ) : profile?.role === "it_admin" ? (
            <>
              <NavLink href="/review">Преглед</NavLink>
              <NavLink href="/accounting">Сметководство</NavLink>
              <NavLink href="/archive">Архива</NavLink>
              <NavLink href="/budget">Буџет</NavLink>
              <NavLink href="/hr">ЧР</NavLink>
            </>
          ) : profile?.role && profile.role !== "applicant" ? (
            <NavLink href="/review">Преглед на апликации</NavLink>
          ) : (
            <>
              <NavLink href="/applicant">Мои апликации</NavLink>
              <NavLink href="/applicant/applications/new">Нова апликација</NavLink>
            </>
          )}
          <NotificationBell unreadCount={unreadCount ?? 0} />
        </nav>

        <div className="p-4 border-t border-border">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* NFR-01: 30-minute inactivity auto-logout */}
      <InactivityGuard />
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {children}
    </Link>
  );
}
