import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/application-status";
import AdvanceActions from "@/components/accounting/advance-actions";
import type { Database } from "@/types/database.types";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const DOCUMENT_LABELS: Record<string, string> = {
  invitation_letter: "Покана за конференција",
  paper_abstract: "Апстракт на трудот",
  conference_program: "Програма на конференцијата",
  cv: "Биографија (CV)",
  travel_plan: "Патен план",
  proof_of_attendance: "Доказ за присуство",
  other: "Друго",
};

const DECISION_LABELS: Record<string, string> = {
  approved: "Одобрено",
  partially_approved: "Делумно одобрено",
  rejected: "Одбиено",
};

const DECISION_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  partially_approved: "bg-orange-100 text-orange-800",
  rejected: "bg-red-100 text-red-800",
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AccountingApplicationPage({
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
    .select("id, role, first_name, last_name, title")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "accounting") redirect("/applicant");

  const { data: application } = await supabase
    .from("applications")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!application) notFound();

  const appStatus = application.status as ApplicationStatus;
  const ACCOUNTING_STATUSES: ApplicationStatus[] = [
    "approved",
    "partially_approved",
    "for_payment",
    "paid",
  ];
  if (!ACCOUNTING_STATUSES.includes(appStatus)) redirect("/accounting");

  const { data: applicant } = await supabase
    .from("profiles")
    .select("first_name, last_name, title, department, email")
    .eq("id", application.applicant_id)
    .single();

  const { data: documents } = await supabase
    .from("application_documents")
    .select("*")
    .eq("application_id", params.id)
    .order("uploaded_at", { ascending: true });

  const docLinks: {
    id: string;
    url: string;
    name: string;
    type: string;
    size: number | null;
  }[] = [];
  for (const doc of documents ?? []) {
    const { data: signed } = await supabase.storage
      .from("application-documents")
      .createSignedUrl(doc.storage_path, 300);
    docLinks.push({
      id: doc.id,
      url: signed?.signedUrl ?? "",
      name: doc.file_name,
      type: doc.document_type,
      size: doc.file_size_bytes,
    });
  }

  const { data: approvals } = await supabase
    .from("approvals")
    .select(
      "id, approver_role, decision, approved_amount, notes, signed_at, created_at"
    )
    .eq("application_id", params.id)
    .order("created_at", { ascending: true });

  const { data: existingAdvance } = await supabase
    .from("advances")
    .select(
      "id, amount, status, payment_reference, payment_date, issued_at, confirmed_at"
    )
    .eq("application_id", params.id)
    .maybeSingle();

  const approvedAmount =
    Number(application.approved_amount ?? application.requested_amount);

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/accounting"
            className="text-xs text-muted-foreground hover:text-foreground mb-2 inline-block"
          >
            ← Назад кон листата
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

      {/* Advance actions — main accounting widget */}
      <AdvanceActions
        applicationId={application.id}
        applicantId={application.applicant_id}
        applicationStatus={appStatus}
        approvedAmount={approvedAmount}
        accountantId={user.id}
        accountantName={`${profile.first_name} ${profile.last_name}`}
        existingAdvance={existingAdvance ?? null}
      />

      {/* Applicant */}
      <section className="border border-border rounded-lg bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Апликант
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Field label="Име и презиме">
            {applicant
              ? `${applicant.first_name} ${applicant.last_name}`
              : "—"}
          </Field>
          <Field label="Звање">{applicant?.title || "—"}</Field>
          <Field label="Катедра">{applicant?.department || "—"}</Field>
          <Field label="Е-пошта">{applicant?.email || "—"}</Field>
        </div>
      </section>

      {/* Conference */}
      <section className="border border-border rounded-lg bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Конференција
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Field label="Датуми на патување">
            {application.travel_start_date} → {application.travel_end_date}
          </Field>
          <Field label="Барано">
            {Number(application.requested_amount).toLocaleString("mk-MK")} МКД
          </Field>
          {application.approved_amount !== null && (
            <Field label="Одобрено">
              <span className="text-green-700 font-semibold">
                {Number(application.approved_amount).toLocaleString("mk-MK")}{" "}
                МКД
              </span>
            </Field>
          )}
        </div>
      </section>

      {/* Approval decisions */}
      {approvals && approvals.length > 0 && (
        <section className="border border-border rounded-lg bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Одлуки
          </h2>
          <ul className="space-y-3">
            {approvals.map((a) => (
              <li key={a.id} className="text-sm space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium capitalize">
                    {a.approver_role === "scientific_council"
                      ? "Научен совет"
                      : "Деканат"}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      DECISION_COLORS[a.decision] ?? ""
                    }`}
                  >
                    {DECISION_LABELS[a.decision] ?? a.decision}
                    {a.approved_amount !== null &&
                      ` · ${Number(a.approved_amount).toLocaleString("mk-MK")} МКД`}
                  </span>
                </div>
                {a.notes && (
                  <p className="text-muted-foreground bg-muted/40 rounded p-2 text-xs leading-relaxed">
                    {a.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Documents */}
      {docLinks.length > 0 && (
        <section className="border border-border rounded-lg bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Документи
          </h2>
          <ul className="space-y-2">
            {docLinks.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">
                    {DOCUMENT_LABELS[doc.type] ?? doc.type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {doc.name}
                    {doc.size ? ` · ${formatBytes(doc.size)}` : ""}
                  </p>
                </div>
                {doc.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 px-3 py-1.5 border border-border rounded-md text-xs font-medium hover:bg-accent transition-colors"
                  >
                    Преземи
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Недостапно
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
