import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/application-status";
import type { ApplicationStatus } from "@/types/database.types";

export const metadata = { title: "Мои апликации — STGS" };

const STATUS_ACCENT: Record<string, string> = {
  draft: "border-l-slate-300",
  submitted: "border-l-blue-400",
  under_council_review: "border-l-blue-500",
  under_deanery_review: "border-l-blue-600",
  approved: "border-l-emerald-500",
  partially_approved: "border-l-yellow-500",
  rejected: "border-l-red-500",
  for_payment: "border-l-amber-500",
  paid: "border-l-amber-600",
  report_submitted: "border-l-violet-400",
  in_settlement: "border-l-violet-500",
  closed: "border-l-slate-400",
};

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

  const hasApps = (applications ?? []).length > 0;

  return (
    <div className="p-8 w-full">
      {/* ── Hero header card ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 mb-6 text-white shadow-xl">
        <div
          className="pointer-events-none absolute inset-0 animate-[shimmer_4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"
          aria-hidden="true"
        />
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/[0.04]" />
        <div className="absolute -right-3 top-12 w-24 h-24 rounded-full bg-white/[0.04]" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Мои апликации</h1>
            <p className="text-sm text-white/50 mt-1">
              Апликации за научни патувања — ФИНКИ
            </p>
          </div>
          <Link
            href="/applicant/applications/new"
            className="px-4 py-2.5 bg-white text-slate-900 rounded-xl text-sm font-semibold shadow-lg hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            + Нова апликација
          </Link>
        </div>
      </div>

      {/* ── Bento stat grid (asymmetric) ── */}
      {hasApps && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Large tile: total requested (spans 2 cols) */}
          <div className="col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-blue-500/25">
            <div
              className="pointer-events-none absolute inset-0 animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
              aria-hidden="true"
            />
            <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10" />
            <div className="absolute right-10 -bottom-2 w-18 h-18 rounded-full bg-white/10" />
            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-100/70 mb-3">
                Барано вкупно
              </p>
              <p className="text-5xl font-extrabold tracking-tight leading-none">
                {fmt(totalRequested)}
              </p>
              <p className="text-lg font-medium text-blue-100/60 mt-1">МКД</p>
              <p className="text-sm text-blue-100/50 mt-3">
                {(applications ?? []).length}{" "}
                {(applications ?? []).length === 1 ? "апликација" : "апликации"} вкупно
              </p>
            </div>
          </div>

          {/* Right column: 2 stacked smaller cards */}
          <div className="col-span-1 flex flex-col gap-4">
            {/* Approved */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-5 text-white shadow-lg shadow-emerald-500/25 flex-1">
              <div
                className="pointer-events-none absolute inset-0 animate-[shimmer_3.5s_ease-in-out_1s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
                aria-hidden="true"
              />
              <div className="relative z-10">
                <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100/70 mb-2">
                  Одобрено
                </p>
                <p className="text-2xl font-extrabold leading-tight">
                  {fmt(totalApproved)}
                  <span className="text-sm font-medium ml-1 text-emerald-100/60">МКД</span>
                </p>
                <p className="text-xs text-emerald-100/50 mt-1.5">
                  {activeCounts.approved} активни
                </p>
              </div>
            </div>

            {/* In-review with animated pulse */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 p-5 text-white shadow-lg shadow-violet-500/25 flex-1">
              <div
                className="pointer-events-none absolute inset-0 animate-[shimmer_4s_ease-in-out_0.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
                aria-hidden="true"
              />
              <div className="relative z-10">
                <p className="text-xs font-semibold uppercase tracking-widest text-violet-100/70 mb-2">
                  Во разгледување
                </p>
                <div className="flex items-center gap-2.5">
                  <p className="text-2xl font-extrabold">{activeCounts.submitted}</p>
                  {activeCounts.submitted > 0 && (
                    <span className="relative flex h-3 w-3" title="Активни апликации">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-200 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-violet-200" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-violet-100/50 mt-1.5">
                  {activeCounts.closed} затворени
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-sm mb-6 border border-destructive/20">
          Грешка при вчитување: {error.message}
        </div>
      )}

      {/* ── Application list ── */}
      {!applications || applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl bg-card/50">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4 text-2xl select-none">
            📄
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Немате апликации сè уште
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Поднесете прва апликација за научно патување
          </p>
          <Link
            href="/applicant/applications/new"
            className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold shadow-md hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Поднесете прва апликација
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border bg-muted/20">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Апликации
            </h2>
          </div>
          <div className="divide-y divide-border">
            {applications.map((app) => (
              <div
                key={app.id}
                className={`flex items-center gap-4 pl-4 pr-5 py-4 border-l-4 ${
                  STATUS_ACCENT[app.status] ?? "border-l-border"
                } hover:bg-muted/30 transition-colors group`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                    {app.conference_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {app.conference_location} &middot;{" "}
                    {formatDate(app.travel_start_date)} –{" "}
                    {formatDate(app.travel_end_date)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatAmount(app.requested_amount)} МКД
                  </p>
                  {app.submitted_at && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(app.submitted_at)}
                    </p>
                  )}
                </div>

                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                    STATUS_COLORS[app.status as ApplicationStatus]
                  }`}
                >
                  {STATUS_LABELS[app.status as ApplicationStatus] ?? app.status}
                </span>

                {app.status === "paid" && (
                  <Link
                    href={`/applicant/applications/${app.id}/report/new`}
                    className="shrink-0 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                  >
                    Поднеси извештај →
                  </Link>
                )}
              </div>
            ))}
          </div>
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
