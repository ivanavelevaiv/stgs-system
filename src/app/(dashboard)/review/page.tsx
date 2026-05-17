import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/application-status";
import type { Database } from "@/types/database.types";

type UserRole = Database["public"]["Enums"]["user_role"];
type ApplicationStatus = Database["public"]["Enums"]["application_status"];

export const metadata = { title: "Преглед на апликации — STGS" };

const QUEUE_STATUSES: Partial<Record<UserRole, ApplicationStatus[]>> = {
  scientific_council: ["submitted", "under_review_council"],
  deanery: ["under_review_deanery"],
  it_admin: ["submitted", "under_review_council", "under_review_deanery"],
};

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  scientific_council: "Научен совет",
  deanery: "Деканат",
  it_admin: "ИТ Администратор",
};

export default async function ReviewQueuePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .single();

  const userRole = profile?.role as UserRole | undefined;
  const statuses = userRole ? QUEUE_STATUSES[userRole] : undefined;
  if (!statuses) redirect("/applicant");

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, conference_name, conference_location, travel_start_date, travel_end_date, requested_amount, status, submitted_at, applicant_id"
    )
    .in("status", statuses)
    .order("submitted_at", { ascending: true });

  // Fetch applicant names separately to avoid complex join typing
  const applicantIds = Array.from(
    new Set((applications ?? []).map((a) => a.applicant_id))
  );
  const { data: applicantProfiles } = applicantIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, title")
        .in("id", applicantIds)
    : { data: [] };

  const profileMap = Object.fromEntries(
    (applicantProfiles ?? []).map((p) => [p.id, p])
  );

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Преглед на апликации</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {userRole ? ROLE_LABELS[userRole] : ""} — апликации кои чекаат на
          одлука
        </p>
      </div>

      {!applications || applications.length === 0 ? (
        <div className="border border-border rounded-lg bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            Нема апликации за преглед во моментов.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium">Апликант</th>
                <th className="text-left px-4 py-3 font-medium">Конференција</th>
                <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                  Датуми на патување
                </th>
                <th className="text-right px-4 py-3 font-medium whitespace-nowrap">
                  Барано (МКД)
                </th>
                <th className="text-left px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const p = profileMap[app.applicant_id];
                return (
                  <tr
                    key={app.id}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {p ? `${p.first_name} ${p.last_name}` : "—"}
                      </p>
                      {p?.title && (
                        <p className="text-xs text-muted-foreground">{p.title}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{app.conference_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {app.conference_location}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {app.travel_start_date} → {app.travel_end_date}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {Number(app.requested_amount).toLocaleString("mk-MK")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[app.status as ApplicationStatus]
                        }`}
                      >
                        {STATUS_LABELS[app.status as ApplicationStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/review/${app.id}`}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
                      >
                        Разгледај →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
