import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationList from "@/components/notifications/notification-list";

export const metadata = { title: "Известувања — STGS" };

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, is_read, created_at, application_id")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Известувања</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Системски пораки и промени на статус
        </p>
      </div>
      <NotificationList initialNotifications={notifications ?? []} />
    </div>
  );
}
