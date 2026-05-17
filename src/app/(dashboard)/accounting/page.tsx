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

type AppRow = {
  id: string;
  conference_name: string;
  conference_location: string;
  travel_start_date: string;
  travel_end_date: string;
  approved_amount: number | null;
  requested_amount: number;
  status: string;
  submitted_at: string | null;
  applicant_id: string;
};

type ProfileMap = Record<
  string,
  { first_name: string | null; last_name: string | null; title: string | null }
>;

function AppSection({
  rows,
  label,
  accentBorder,
  dotColor,
  chipCls,
  profileMap,
  settlementIds,
}: {
  rows: AppRow[];
  label: string;
  accentBorder: string;
  dotColor: string;
  chipCls: string;
  profileMap: ProfileMap;
  settlementIds: Set<string>;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className={`relative flex h-2.5 w-2.5 shrink-0`}>
          <span className={`absolute inset-0 rounded-full ${dotColor} opacity-40 animate-ping`} />
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`} />
        </span>
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex-1">
          {label}
        </h2>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${chipCls}`}>
          {rows.length}
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {rows.map((app) => {
            const p = profileMap[app.applicant_id];
            const amount = app.approved_amount ?? app.requested_amount;
            const href = settlementIds.has(app.id)
              ? `/accounting/settlement/${app.id}`
              : `/accounting/${app.id}`;
            return (
              <div
                key={app.id}
                className={`flex items-center gap-4 pl-4 pr-5 py-4 border-l-4 ${accentBorder} hover:bg-muted/30 transition-colors group`}
              >
                {/* Applicant */}
                <div className="w-36 shrink-0">
                  <p className="text-sm font-semibold leading-tight truncate">
                    {p ? `${p.first_name} ${p.last_name}` : "—"}
                  </p>
                  {p?.title && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.title}</p>
                  )}
                </div>

                {/* Conference */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {app.conference_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {app.conference_location} &middot; {app.travel_start_date} → {app.travel_end_date}
                  </p>
                </div>

                {/* Amount */}
                <div className="w-28 shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums">
                    {Number(amount).toLocaleString("mk-MK")} МКД
                  </p>
                </div>

                {/* Status badge */}
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium ${
                    STATUS_COLORS[app.status as ApplicationStatus]
                  }`}
                >
                  {STATUS_LABELS[app.status as ApplicationStatus]}
                </span>

                {/* Action */}
                <Link
                  href={href}
                  className="shrink-0 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                >
                  Обработи →
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

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

  const profileMap: ProfileMap = Object.fromEntries(
    (applicantProfiles ?? []).map((p) => [p.id, p])
  );

  const pending = (applications ?? []).filter(
    (a) => a.status === "approved" || a.status === "partially_approved"
  );
  const inProgress = (applications ?? []).filter((a) => a.status === "for_payment");
  const completed = (applications ?? []).filter((a) => a.status === "paid");
  const settlement = (applications ?? []).filter(
    (a) => a.status === "report_submitted" || a.status === "in_settlement"
  );

  const settlementIds = new Set(settlement.map((a) => a.id));
  const isEmpty =
    pending.length === 0 &&
    inProgress.length === 0 &&
    completed.length === 0 &&
    settlement.length === 0;

  return (
    <div className="p-8 w-full space-y-8">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 p-6 text-white shadow-xl">
        <div
          className="pointer-events-none absolute inset-0 animate-[shimmer_4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"
          aria-hidden="true"
        />
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/[0.04]" />
        <div className="absolute -right-3 top-12 w-24 h-24 rounded-full bg-white/[0.04]" />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-300/60 mb-1">
            ФИНКИ — Сметководство
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Аванси и порамнување</h1>
          <p className="text-sm text-white/50 mt-1">
            Управување со исплата на одобрени аванси
          </p>
        </div>
      </div>

      {/* ── Queue-count chips ── */}
      {!isEmpty && (
        <div className="flex flex-wrap gap-2">
          {pending.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              {pending.length} чека налог
            </span>
          )}
          {inProgress.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {inProgress.length} за исплата
            </span>
          )}
          {completed.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {completed.length} исплатено
            </span>
          )}
          {settlement.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-xs font-semibold text-violet-800">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              {settlement.length} порамнување
            </span>
          )}
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-2xl bg-card/50 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4 text-2xl select-none">
            ✓
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Нема апликации за обработка
          </p>
          <p className="text-xs text-muted-foreground">
            Сите аванси и порамнувања се во ред
          </p>
        </div>
      )}

      <AppSection
        rows={pending}
        label="Чека на издавање на налог"
        accentBorder="border-l-amber-400"
        dotColor="bg-amber-500"
        chipCls="bg-amber-50 border-amber-200 text-amber-700"
        profileMap={profileMap}
        settlementIds={settlementIds}
      />

      <AppSection
        rows={inProgress}
        label="За исплата"
        accentBorder="border-l-blue-400"
        dotColor="bg-blue-500"
        chipCls="bg-blue-50 border-blue-200 text-blue-700"
        profileMap={profileMap}
        settlementIds={settlementIds}
      />

      <AppSection
        rows={completed}
        label="Исплатено"
        accentBorder="border-l-emerald-400"
        dotColor="bg-emerald-500"
        chipCls="bg-emerald-50 border-emerald-200 text-emerald-700"
        profileMap={profileMap}
        settlementIds={settlementIds}
      />

      <AppSection
        rows={settlement}
        label="Порамнување"
        accentBorder="border-l-violet-400"
        dotColor="bg-violet-500"
        chipCls="bg-violet-50 border-violet-200 text-violet-700"
        profileMap={profileMap}
        settlementIds={settlementIds}
      />
    </div>
  );
}
