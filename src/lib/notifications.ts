import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type DbNotificationType = Database["public"]["Enums"]["notification_type"];

export async function createNotification({
  recipientId,
  applicationId,
  type,
  title,
  body,
}: {
  recipientId: string;
  applicationId: string;
  type: DbNotificationType;
  title: string;
  body: string;
}) {
  const supabase = createClient();
  await supabase.from("notifications").insert({
    recipient_id: recipientId,
    application_id: applicationId,
    type,
    title,
    body,
    is_read: false,
  });
}
