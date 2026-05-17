import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/application-status";
import DecisionForm from "@/components/review/decision-form";
import type { Database } from "@/types/database.types";

type UserRole = Database["public"]["Enums"]["user_role"];
type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const REVIEWER_ROLES: UserRole[] = ["scientific_council", "deanery", "it_admin"];

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

const APPROVER_ROLE_LABELS: Partial<Record<UserRole, string>> = {
  scientific_council: "Научен совет",
  deanery: "Деканат",
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function ReviewApplicationPage({
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
    .select("id, role, first_name, last_name, title, department")
    .eq("id", user.id)
    .single();

  if (!profile || !REVIEWER_ROLES.includes(profile.role as UserRole)) {
    redirect("/applicant");
  }

  const { data: application } = await supabase
    .from("applications")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!application) notFound();

  // Applicant profile
  const { data: applicant } = await supabase
    .from("profiles")
    .select("first_name, last_name, title, department, email, iknow_id")
    .eq("id", application.applicant_id)
    .single();

  // Documents + signed URLs
  const { data: documents } = await supabase
    .from("application_documents")
    .select("*")
    .eq("application_id", params.id)
    .order("uploaded_at", { ascending: true });

  const docLinks: { id: string; url: string; name: string; type: string; size: number | null }[] = [];
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

  // Existing approvals
  const { data: approvals } = await supabase
    .from("approvals")
    .select("id, approver_role, decision, approved_amount, notes, signed_at, created_at")
    .eq("application_id", params.id)
    .order("created_at", { ascending: true });

  const userRole = profile.role as UserRole;
  const appStatus = application.status as ApplicationStatus;

  const alreadyActed = (approvals ?? []).some((a) => a.approver_role === userRole);
  const canAct =
    !alreadyActed &&
    ((userRole === "scientific_council" &&
      (appStatus === "submitted" || appStatus === "under_review_council")) ||
      (userRole === "deanery" && appStatus === "under_review_deanery"));

  return (
    <div className="p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/review"
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

      {/* Applicant info */}
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
          <Field label="Катедра / Оддел">{applicant?.department || "—"}</Field>
          <Field label="Е-пошта">{applicant?.email || "—"}</Field>
          {applicant?.iknow_id && (
            <Field label="iKnow ID">{applicant.iknow_id}</Field>
          )}
        </div>
      </section>

      {/* Conference details */}
      <section className="border border-border rounded-lg bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Детали за конференцијата
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Field label="Конференција">{application.conference_name}</Field>
          <Field label="Локација">{application.conference_location}</Field>
          <Field label="Датуми на патување">
            {application.travel_start_date} → {application.travel_end_date}
          </Field>
          {application.conference_url && (
            <Field label="URL">
              <a
                href={application.conference_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 break-all"
              >
                {application.conference_url}
              </a>
            </Field>
          )}
          {application.paper_title && (
            <Field label="Наслов на труд" className="col-span-2">
              {application.paper_title}
            </Field>
          )}
          <Field label="Цел на патување" className="col-span-2">
            {application.purpose}
          </Field>
        </div>
      </section>

      {/* Budget */}
      <section className="border border-border rounded-lg bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Буџет
        </h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Барано средства</span>
          <span className="text-lg font-semibold font-mono">
            {Number(application.requested_amount).toLocaleString("mk-MK")} МКД
          </span>
        </div>
        {application.approved_amount !== null && (
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">Одобрено</span>
            <span className="text-lg font-semibold font-mono text-green-700">
              {Number(application.approved_amount).toLocaleString("mk-MK")} МКД
            </span>
          </div>
        )}
      </section>

      {/* Documents */}
      <section className="border border-border rounded-lg bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Прикачени документи
        </h2>
        {docLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нема прикачени документи.</p>
        ) : (
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
        )}
      </section>

      {/* Approval history */}
      {approvals && approvals.length > 0 && (
        <section className="border border-border rounded-lg bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Историја на одлуки
          </h2>
          <ul className="space-y-4">
            {approvals.map((a) => (
              <li key={a.id} className="text-sm space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {APPROVER_ROLE_LABELS[a.approver_role as UserRole] ??
                      a.approver_role}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        DECISION_COLORS[a.decision] ?? ""
                      }`}
                    >
                      {DECISION_LABELS[a.decision] ?? a.decision}
                    </span>
                    {a.approved_amount !== null && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {Number(a.approved_amount).toLocaleString("mk-MK")} МКД
                      </span>
                    )}
                  </div>
                </div>
                {a.notes && (
                  <p className="text-muted-foreground bg-muted/40 rounded p-2 text-xs leading-relaxed">
                    {a.notes}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Потпишано:{" "}
                  {a.signed_at
                    ? new Date(a.signed_at).toLocaleString("mk-MK")
                    : "—"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Decision form */}
      {canAct && (
        <DecisionForm
          applicationId={application.id}
          applicationStatus={appStatus}
          requestedAmount={Number(application.requested_amount)}
          approverId={user.id}
          approverRole={userRole}
          approverName={`${profile.first_name} ${profile.last_name}`}
        />
      )}

      {!canAct && (appStatus === "approved" || appStatus === "partially_approved" || appStatus === "rejected") && (
        <div className="border border-border rounded-lg bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          Оваа апликација е финализирана — {STATUS_LABELS[appStatus].toLowerCase()}.
        </div>
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
