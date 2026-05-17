import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/application-status";
import SettlementView from "@/components/accounting/settlement-view";
import type { Database } from "@/types/database.types";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];
type SettlementDirection = Database["public"]["Enums"]["settlement_direction"];

const SETTLEABLE: ApplicationStatus[] = ["report_submitted", "in_settlement"];

export const metadata = { title: "Порамнување — STGS" };

export default async function SettlementPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "accounting") redirect("/applicant");

  const { data: application } = await supabase
    .from("applications")
    .select(
      "id, conference_name, conference_location, travel_start_date, travel_end_date, approved_amount, requested_amount, status, applicant_id, report_deadline"
    )
    .eq("id", params.id)
    .single();

  if (!application) notFound();

  const appStatus = application.status as ApplicationStatus;
  if (!SETTLEABLE.includes(appStatus)) redirect("/accounting");

  // Applicant profile
  const { data: applicant } = await supabase
    .from("profiles")
    .select("first_name, last_name, title, department, email")
    .eq("id", application.applicant_id)
    .single();

  // Expense report
  const { data: expenseReport } = await supabase
    .from("expense_reports")
    .select("id, total_claimed, notes, submitted_at, status")
    .eq("application_id", params.id)
    .single();

  if (!expenseReport) notFound();

  // Receipts
  const { data: receipts } = await supabase
    .from("receipts")
    .select(
      "id, file_name, amount, currency, expense_date, category, ocr_confidence, is_duplicate_suspect, is_manually_verified"
    )
    .eq("expense_report_id", expenseReport.id)
    .order("uploaded_at", { ascending: true });

  // Advance amount
  const { data: advance } = await supabase
    .from("advances")
    .select("amount")
    .eq("application_id", params.id)
    .single();

  const advanceAmount = Number(advance?.amount ?? application.approved_amount ?? 0);

  // Existing settlement (for in_settlement status)
  const { data: existingSettlement } = await supabase
    .from("settlements")
    .select("id, direction, status, claimed_amount, difference")
    .eq("application_id", params.id)
    .maybeSingle();

  return (
    <div className="p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/accounting"
            className="text-xs text-muted-foreground hover:text-foreground mb-2 inline-block"
          >
            ← Назад
          </Link>
          <h1 className="text-xl font-bold leading-tight">
            {application.conference_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {application.conference_location}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex px-3 py-1 rounded-full text-xs font-medium ${
            STATUS_COLORS[appStatus]
          }`}
        >
          {STATUS_LABELS[appStatus]}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="border border-border rounded-lg bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Апликант</p>
          <p className="font-medium">
            {applicant ? `${applicant.first_name} ${applicant.last_name}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">{applicant?.title}</p>
        </div>
        <div className="border border-border rounded-lg bg-card p-4 space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Извештај поднесен</p>
          <p className="font-medium">
            {expenseReport.submitted_at
              ? new Date(expenseReport.submitted_at).toLocaleDateString("mk-MK")
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {receipts?.length ?? 0} рецепти ·{" "}
            {Number(expenseReport.total_claimed).toLocaleString("mk-MK")} МКД барано
          </p>
        </div>
      </div>

      {expenseReport.notes && (
        <div className="border border-border rounded-lg bg-muted/30 px-4 py-3 text-sm">
          <span className="text-xs text-muted-foreground uppercase tracking-wide mr-2">
            Напомени:
          </span>
          {expenseReport.notes}
        </div>
      )}

      {/* Settlement view (client component) */}
      <SettlementView
        applicationId={application.id}
        applicantId={application.applicant_id}
        advanceAmount={advanceAmount}
        initialReceipts={receipts ?? []}
        accountantId={user.id}
        accountantName={`${profile.first_name} ${profile.last_name}`}
        existingSettlement={
          existingSettlement
            ? {
                id: existingSettlement.id,
                direction: existingSettlement.direction as SettlementDirection,
                status: existingSettlement.status,
                claimed_amount: Number(existingSettlement.claimed_amount),
                difference: existingSettlement.difference
                  ? Number(existingSettlement.difference)
                  : null,
              }
            : null
        }
      />
    </div>
  );
}
