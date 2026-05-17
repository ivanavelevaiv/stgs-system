import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/application-status";
import type { ApplicationStatus } from "@/types/database.types";

export const metadata = { title: "Мои апликации — STGS" };

export default async function ApplicantDashboard() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: applications, error } = await supabase
    .from("applications")
    .select(
      "id, conference_name, conference_location, travel_start_date, travel_end_date, requested_amount, approved_amount, status, submitted_at"
    )
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false });

  // Budget widget stats
  const totalRequested = (applications ?? []).reduce(
    (s, a) => s + Number(a.requested_amount ?? 0),
    0
  );
  const totalApproved = (applications ?? [])
    .filter((a) => a.approved_amount != null)
    .reduce((s, a) => s + Number(a.approved_amount ?? 0), 0);
  const activeCounts = {
    submitted: (applications ?? []).filter((a) =>
      ["submitted", "under_council_review", "under_deanery_review"].includes(a.status)
    ).length,
    approved: (applications ?? []).filter((a) =>
      ["approved", "partially_approved", "for_payment", "paid"].includes(a.status)
    ).length,
    closed: (applications ?? []).filter((a) => a.status === "closed").length,
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Мои апликации</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Апликации за научни патувања
          </p>
        </div>
        <Link
          href="/applicant/applications/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + Нова апликација
        </Link>
      </div>

      {/* Budget widget */}
      {(applications ?? []).length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="border border-border rounded-lg bg-card p-4 space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Барано вкупно</p>
            <p className="text-xl font-bold">{fmt(totalRequested)} МКД</p>
            <p className="text-xs text-muted-foreground">{(applications ?? []).length} апликации</p>
          </div>
          <div className="border border-border rounded-lg bg-card p-4 space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Одобрено</p>
            <p className="text-xl font-bold text-green-700">{fmt(totalApproved)} МКД</p>
            <p className="text-xs text-muted-foreground">{activeCounts.approved} активни</p>
          </div>
          <div className="border border-border rounded-lg bg-card p-4 space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Во разгледување</p>
            <p className="text-xl font-bold text-blue-700">{activeCounts.submitted}</p>
            <p className="text-xs text-muted-foreground">{activeCounts.closed} затворени</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm mb-6">
          Грешка при вчитување: {error.message}
        </div>
      )}

      {!applications || applications.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">Немате апликации сè уште.</p>
          <Link
            href="/applicant/applications/new"
            className="mt-4 inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Поднесете прва апликација
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="flex items-center gap-4 p-4 border border-border rounded-lg bg-card hover:bg-accent/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{app.conference_name}</p>
                <p className="text-sm text-muted-foreground">
                  {app.conference_location} &middot;{" "}
                  {formatDate(app.travel_start_date)} –{" "}
                  {formatDate(app.travel_end_date)}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm font-medium">
                  {formatAmount(app.requested_amount)} МКД
                </p>
                {app.submitted_at && (
                  <p className="text-xs text-muted-foreground">
                    Поднесена {formatDate(app.submitted_at)}
                  </p>
                )}
              </div>

              <span
                className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  STATUS_COLORS[app.status as ApplicationStatus]
                }`}
              >
                {STATUS_LABELS[app.status as ApplicationStatus] ?? app.status}
              </span>

              {app.status === "paid" && (
                <Link
                  href={`/applicant/applications/${app.id}/report/new`}
                  className="shrink-0 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Поднеси извештај →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("mk-MK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("mk-MK").format(amount);
}

function fmt(n: number) {
  return new Intl.NumberFormat("mk-MK").format(Math.round(n));
}
