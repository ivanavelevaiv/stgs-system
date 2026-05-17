import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ExpenseReportForm from "@/components/expense-report/expense-report-form";

export const metadata = { title: "Поднеси извештај — STGS" };

export default async function NewExpenseReportPage({
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
    .select("id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "applicant") redirect("/applicant");

  // Load the application — must belong to this user and be 'paid'
  const { data: application } = await supabase
    .from("applications")
    .select(
      "id, conference_name, conference_location, travel_start_date, travel_end_date, approved_amount, requested_amount, status, report_deadline, applicant_id"
    )
    .eq("id", params.id)
    .eq("applicant_id", user.id)
    .single();

  if (!application) notFound();

  if (application.status === "paid") {
    // Allow new report
  } else if (
    application.status === "report_submitted" ||
    application.status === "in_settlement" ||
    application.status === "closed"
  ) {
    // Report already submitted — load and show read-only summary
    const { data: report } = await supabase
      .from("expense_reports")
      .select("id, total_claimed, status, submitted_at, notes")
      .eq("application_id", params.id)
      .single();

    const { data: receipts } = await supabase
      .from("receipts")
      .select("id, file_name, amount, currency, expense_date, category, ocr_confidence, is_duplicate_suspect, is_manually_verified")
      .eq("expense_report_id", report?.id ?? "")
      .order("uploaded_at", { ascending: true });

    const CATEGORY_LABELS: Record<string, string> = {
      accommodation: "Сместување",
      transport: "Транспорт",
      registration_fee: "Котизација",
      meals: "Оброци",
      other: "Друго",
    };

    return (
      <div className="p-8 max-w-2xl space-y-6">
        <div>
          <Link
            href="/applicant"
            className="text-xs text-muted-foreground hover:text-foreground mb-2 inline-block"
          >
            ← Назад
          </Link>
          <h1 className="text-xl font-bold">Извештај поднесен</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {application.conference_name} — {application.conference_location}
          </p>
        </div>

        <div className="border border-green-200 rounded-lg bg-green-50 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-green-800">Извештајот е успешно поднесен</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-green-700">Вкупно потраћено</dt>
              <dd className="font-medium font-mono">
                {Number(report?.total_claimed ?? 0).toLocaleString("mk-MK")} МКД
              </dd>
            </div>
            <div>
              <dt className="text-xs text-green-700">Поднесен на</dt>
              <dd className="font-medium">
                {report?.submitted_at
                  ? new Date(report.submitted_at).toLocaleDateString("mk-MK")
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>

        {receipts && receipts.length > 0 && (
          <section className="border border-border rounded-lg bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Рецепти ({receipts.length})
            </h2>
            <ul className="divide-y divide-border">
              {receipts.map((r) => (
                <li key={r.id} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_LABELS[r.category] ?? r.category}
                      {r.expense_date ? ` · ${r.expense_date}` : ""}
                      {r.is_duplicate_suspect && (
                        <span className="ml-2 text-orange-600">⚠ Дупликат</span>
                      )}
                      {r.is_manually_verified && (
                        <span className="ml-2 text-blue-600">✓ Рачно</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-medium">
                      {Number(r.amount ?? 0).toLocaleString("mk-MK")} {r.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      OCR {Math.round((r.ocr_confidence ?? 0) * 100)}%
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  } else {
    // Application is not in a reportable state
    redirect("/applicant");
  }

  const approvedAmount = Number(application.approved_amount ?? application.requested_amount);

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <Link
          href="/applicant"
          className="text-xs text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          ← Назад кон апликациите
        </Link>
        <h1 className="text-xl font-bold">Извештај од патување</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {application.conference_name} — {application.conference_location}
        </p>
        {application.report_deadline && (
          <p className="text-xs text-muted-foreground mt-1">
            Рок за поднесување: {application.report_deadline}
          </p>
        )}
      </div>

      <ExpenseReportForm
        applicationId={application.id}
        applicantId={user.id}
        applicationContext={{
          travelStartDate: application.travel_start_date,
          travelEndDate: application.travel_end_date,
          approvedAmount,
          reportDeadline: application.report_deadline,
          conferenceName: application.conference_name,
        }}
      />
    </div>
  );
}
