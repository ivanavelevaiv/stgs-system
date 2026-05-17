import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/application-status";
import type { Database } from "@/types/database.types";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

export const metadata = { title: "Сметководство — STGS" };

const ACCOUNTING_STATUSES: ApplicationStatus[] = [
  "approved",
  "partially_approved",
  "for_payment",
  "paid",
  "report_submitted",
  "in_settlement",
];

export default async function AccountingQueuePage() {
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

  if (!profile || profile.role !== "accounting") redirect("/applicant");

  const { data: applications } = await supabase
    .from("applications")
    .select(
      "id, conference_name, conference_location, travel_start_date, travel_end_date, approved_amount, requested_amount, status, submitted_at, applicant_id"
    )
    .in("status", ACCOUNTING_STATUSES)
    .order("submitted_at", { ascending: true });

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

  const pending = (applications ?? []).filter(
    (a) => a.status === "approved" || a.status === "partially_approved"
  );
  const inProgress = (applications ?? []).filter(
    (a) => a.status === "for_payment"
  );
  const completed = (applications ?? []).filter((a) => a.status === "paid");
  const settlement = (applications ?? []).filter(
    (a) => a.status === "report_submitted" || a.status === "in_settlement"
  );

  function AppTable({
    rows,
  }: {
    rows: typeof applications extends null ? never[] : NonNullable<typeof applications>;
  }) {
    if (!rows || rows.length === 0) return null;
    return (
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-medium">Апликант</th>
              <th className="text-left px-4 py-3 font-medium">Конференција</th>
              <th className="text-left px-4 py-3 font-medium whitespace-nowrap">
                Датуми
              </th>
              <th className="text-right px-4 py-3 font-medium whitespace-nowrap">
                Одобрено (МКД)
              </th>
              <th className="text-left px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((app) => {
              const p = profileMap[app.applicant_id];
              const amount = app.approved_amount ?? app.requested_amount;
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
                    {Number(amount).toLocaleString("mk-MK")}
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
                      href={
                        app.status === "report_submitted" || app.status === "in_settlement"
                          ? `/accounting/settlement/${app.id}`
                          : `/accounting/${app.id}`
                      }
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                      Обработи →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Сметководство — Аванси</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Управување со исплата на одобрени аванси
        </p>
      </div>

      {pending.length === 0 && inProgress.length === 0 && completed.length === 0 && settlement.length === 0 && (
        <div className="border border-border rounded-lg bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">
            Нема апликации за обработка во моментов.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Чека на издавање на налог
          </h2>
          <AppTable rows={pending} />
        </section>
      )}

      {inProgress.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            За исплата
          </h2>
          <AppTable rows={inProgress} />
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Исплатено
          </h2>
          <AppTable rows={completed} />
        </section>
      )}

      {settlement.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Порамнување
          </h2>
          <AppTable rows={settlement} />
        </section>
      )}
    </div>
  );
}
