import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/application-status";
import type { ApplicationStatus } from "@/types/database.types";

export const metadata = { title: "ЧР — STGS" };

export default async function HrPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["hr", "it_admin"].includes(profile.role ?? "")) {
    redirect("/applicant");
  }

  // HR sees approved decisions (any status post-approval)
  const HR_STATUSES: ApplicationStatus[] = [
    "approved",
    "partially_approved",
    "for_payment",
    "paid",
    "report_submitted",
    "in_settlement",
    "closed",
  ];

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, conference_name, conference_location, travel_start_date, travel_end_date, approved_amount, requested_amount, status, submitted_at, applicant_id, archive_number"
    )
    .in("status", HR_STATUSES)
    .order("submitted_at", { ascending: false });

  // Fetch applicant profiles
  const applicantIds = Array.from(new Set((applications ?? []).map((a) => a.applicant_id)));
  const { data: profiles } = applicantIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, department, title")
        .in("id", applicantIds)
    : { data: [] };

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const counts = HR_STATUSES.reduce(
    (acc, s) => {
      acc[s] = (applications ?? []).filter((a) => a.status === s).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalApproved = (applications ?? [])
    .filter((a) => ["approved", "partially_approved", "for_payment", "paid", "report_submitted", "in_settlement", "closed"].includes(a.status))
    .reduce((s, a) => s + Number(a.approved_amount ?? 0), 0);

  return (
    <div className="p-8 w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Човечки ресурси — одобрени патувања</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Само за читање · Преглед на сите одобрени апликации
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 text-sm">
        <div className="border border-border rounded-lg bg-card p-3 space-y-0.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Вкупно одобрени</p>
          <p className="text-xl font-bold">{applications?.length ?? 0}</p>
        </div>
        <div className="border border-border rounded-lg bg-card p-3 space-y-0.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Активни</p>
          <p className="text-xl font-bold text-blue-700">
            {(counts.approved ?? 0) + (counts.partially_approved ?? 0) + (counts.for_payment ?? 0)}
          </p>
        </div>
        <div className="border border-border rounded-lg bg-card p-3 space-y-0.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Затворени</p>
          <p className="text-xl font-bold text-green-700">{counts.closed ?? 0}</p>
        </div>
        <div className="border border-border rounded-lg bg-card p-3 space-y-0.5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Вкупно одобрен износ</p>
          <p className="text-xl font-bold">{new Intl.NumberFormat("mk-MK").format(Math.round(totalApproved))} МКД</p>
        </div>
      </div>

      {/* Applications table */}
      {!applications || applications.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
          Нема одобрени апликации.
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Апликант</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Конференција</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Датуми</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Одобрено</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {applications.map((app) => {
                const p = profileMap[app.applicant_id];
                return (
                  <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {p ? `${p.first_name} ${p.last_name}` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{p?.department}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium truncate max-w-xs">{app.conference_name}</p>
                      <p className="text-xs text-muted-foreground">{app.conference_location}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(app.travel_start_date)} – {formatDate(app.travel_end_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {new Intl.NumberFormat("mk-MK").format(Number(app.approved_amount ?? 0))} МКД
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[app.status as ApplicationStatus]
                        }`}
                      >
                        {STATUS_LABELS[app.status as ApplicationStatus] ?? app.status}
                      </span>
                      {app.archive_number && (
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {app.archive_number}
                        </p>
                      )}
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

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("mk-MK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
