"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type ApprovalDecision = Database["public"]["Enums"]["approval_decision"];
type UserRole = Database["public"]["Enums"]["user_role"];
type ApplicationStatus = Database["public"]["Enums"]["application_status"];

interface Props {
  applicationId: string;
  applicationStatus: ApplicationStatus;
  requestedAmount: number;
  approverId: string;
  approverRole: UserRole;
  approverName: string;
}

const DECISION_OPTIONS: {
  value: ApprovalDecision;
  label: string;
  description: string;
}[] = [
  {
    value: "approved",
    label: "Одобри",
    description: "Апликацијата е целосно одобрена со бараниот износ",
  },
  {
    value: "partially_approved",
    label: "Делумно одобри",
    description: "Одобри дел од бараниот износ",
  },
  {
    value: "rejected",
    label: "Одбиј",
    description: "Апликацијата не ги исполнува условите",
  },
];

export default function DecisionForm({
  applicationId,
  applicationStatus,
  requestedAmount,
  approverId,
  approverRole,
  approverName,
}: Props) {
  const router = useRouter();
  const [decision, setDecision] = useState<ApprovalDecision | null>(null);
  const [approvedAmount, setApprovedAmount] = useState(String(requestedAmount));
  const [notes, setNotes] = useState("");
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = decision !== null && notes.trim().length > 0 && !signing;

  function handleDecisionChange(value: ApprovalDecision) {
    setDecision(value);
    if (value === "approved") setApprovedAmount(String(requestedAmount));
  }

  async function handleSign() {
    if (!canSubmit || !decision) return;

    const amount =
      decision === "rejected" ? null : parseFloat(approvedAmount);
    if (decision !== "rejected") {
      if (!amount || amount <= 0) {
        setError("Внесете валиден одобрен износ.");
        return;
      }
      if (amount > requestedAmount) {
        setError("Одобрениот износ не може да биде поголем од бараниот.");
        return;
      }
    }

    setError(null);
    setSigning(true);

    try {
      const supabase = createClient();

      // Scientific council: move submitted → under_review_council so the trigger can fire
      if (
        approverRole === "scientific_council" &&
        applicationStatus === "submitted"
      ) {
        const { error: e } = await supabase
          .from("applications")
          .update({ status: "under_review_council" })
          .eq("id", applicationId);
        if (e) throw e;
      }

      // Deanery approving: link application to budget so trigger deducts correctly
      if (approverRole === "deanery" && decision !== "rejected") {
        const { data: budget } = await supabase
          .from("budgets")
          .select("id")
          .eq("year", new Date().getFullYear())
          .limit(1)
          .maybeSingle();
        if (budget) {
          await supabase
            .from("applications")
            .update({ budget_id: budget.id })
            .eq("id", applicationId)
            .is("budget_id", null);
        }
      }

      // Mock digital signature payload (simulates MAdNS PKI R-04)
      const signaturePayload = {
        signer_id: approverId,
        signer_name: approverName,
        signer_role: approverRole,
        decision,
        approved_amount: amount,
        signed_at: new Date().toISOString(),
        certificate_mock: "FINKI-MK-DEMO-CERT-2026",
        algorithm: "RSA-SHA256 (simulated)",
        application_id: applicationId,
      };

      const { error: insertErr } = await supabase.from("approvals").insert({
        application_id: applicationId,
        approver_id: approverId,
        approver_role: approverRole,
        decision,
        approved_amount: amount,
        notes: notes.trim(),
        signature_payload: signaturePayload,
        signed_at: new Date().toISOString(),
      });

      if (insertErr) throw insertErr;

      router.push("/review");
      router.refresh();
    } catch (err: unknown) {
      setSigning(false);
      setError(
        err instanceof Error ? err.message : "Настана грешка при поднесување."
      );
    }
  }

  return (
    <div className="border border-border rounded-lg bg-card p-6 space-y-6">
      <h2 className="text-base font-semibold">Одлука</h2>

      {/* Decision radio options */}
      <div className="space-y-2">
        {DECISION_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-3 rounded-md border-2 cursor-pointer transition-colors ${
              decision === opt.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <input
              type="radio"
              name="decision"
              value={opt.value}
              checked={decision === opt.value}
              onChange={() => handleDecisionChange(opt.value)}
              className="mt-0.5 shrink-0"
            />
            <div>
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Approved amount — hidden for rejection */}
      {decision && decision !== "rejected" && (
        <div className="space-y-1">
          <label className="text-sm font-medium">
            Одобрен износ (МКД)
            {decision === "approved" && (
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                — еднакво со бараниот
              </span>
            )}
          </label>
          <input
            type="number"
            min={1}
            max={requestedAmount}
            value={approvedAmount}
            readOnly={decision === "approved"}
            onChange={(e) => setApprovedAmount(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring read-only:bg-muted/40 read-only:cursor-default"
          />
          <p className="text-xs text-muted-foreground">
            Барано: {requestedAmount.toLocaleString("mk-MK")} МКД
          </p>
        </div>
      )}

      {/* Required justification notes (R-03) */}
      <div className="space-y-1">
        <label className="text-sm font-medium">
          Образложение <span className="text-destructive">*</span>
        </label>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Задолжително внесете образложение за одлуката..."
          className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Задолжително поле. Образложението се чува во официјалната евиденција
          (R-03).
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </p>
      )}

      {/* Mock digital signature submit */}
      <div className="pt-2 border-t border-border space-y-3">
        <p className="text-xs text-muted-foreground">
          Со кликање, одлуката се финализира со дигитален потпис (симулација на
          MAdNS PKI — R-04).
        </p>
        <button
          type="button"
          onClick={handleSign}
          disabled={!canSubmit}
          className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {signing ? (
            <>
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin inline-block" />
              Се потпишува...
            </>
          ) : (
            "Потпиши и финализирај одлука"
          )}
        </button>
      </div>
    </div>
  );
}
