"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ReceiptUploader from "./receipt-uploader";
import ReceiptCard, { type ReceiptData } from "./receipt-card";

const MAX_PROOF_SIZE = 15 * 1024 * 1024;
const ACCEPTED_PROOF_MIME = ["image/jpeg", "image/png", "application/pdf"];

interface Props {
  applicationId: string;
  applicantId: string;
  applicationContext: {
    travelStartDate: string;
    travelEndDate: string;
    approvedAmount: number;
    reportDeadline: string | null;
    conferenceName: string;
  };
}

export default function ExpenseReportForm({
  applicationId,
  applicantId,
  applicationContext,
}: Props) {
  const router = useRouter();
  const proofInputRef = useRef<HTMLInputElement>(null);

  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deadline warning
  const daysLeft = applicationContext.reportDeadline
    ? Math.ceil(
        (new Date(applicationContext.reportDeadline).getTime() - Date.now()) / 86_400_000
      )
    : null;

  // Running total from done receipts with valid amounts
  const total = receipts
    .filter((r) => r.ocrStatus === "done" && parseFloat(r.amount) > 0)
    .reduce((sum, r) => sum + parseFloat(r.amount), 0);

  const existingHashes = receipts.map((r) => r.contentHash).filter(Boolean);

  // Called by ReceiptUploader for both initial placeholder and updates
  const handleReceiptAdded = useCallback((incoming: ReceiptData) => {
    setReceipts((prev) => {
      const idx = prev.findIndex((r) => r.localId === incoming.localId);
      if (idx === -1) return [...prev, incoming];
      const next = [...prev];
      next[idx] = incoming;
      return next;
    });
  }, []);

  function handleReceiptChange(localId: string, patch: Partial<ReceiptData>) {
    setReceipts((prev) =>
      prev.map((r) => (r.localId === localId ? { ...r, ...patch } : r))
    );
  }

  function handleReceiptRemove(localId: string) {
    setReceipts((prev) => prev.filter((r) => r.localId !== localId));
  }

  function handleProofFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_PROOF_MIME.includes(file.type)) {
      setError("Доказот мора да биде PDF, JPG или PNG.");
      return;
    }
    if (file.size > MAX_PROOF_SIZE) {
      setError("Доказот не смее да биде поголем од 15 MB.");
      return;
    }
    setError(null);
    setProofFile(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (receipts.length === 0) {
      setError("Додајте барем еден рецепт.");
      return;
    }

    const pending = receipts.filter(
      (r) => r.ocrStatus === "uploading" || r.ocrStatus === "ocr_processing"
    );
    if (pending.length > 0) {
      setError("Почекајте сите рецепти да завршат со прикачување.");
      return;
    }

    const failed = receipts.filter((r) => r.ocrStatus === "error");
    if (failed.length > 0) {
      setError("Отстранете рецептите со грешка пред поднесување.");
      return;
    }

    const invalidAmount = receipts.filter(
      (r) => !r.amount || parseFloat(r.amount) <= 0
    );
    if (invalidAmount.length > 0) {
      setError("Сите рецепти мора да имаат позитивен износ.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();

      // Upload proof of attendance if provided
      let proofPath: string | null = null;
      if (proofFile) {
        const proofName = `${applicationId}/${Date.now()}_proof_${proofFile.name}`;
        const { error: proofErr } = await supabase.storage
          .from("proof-of-attendance")
          .upload(proofName, proofFile);
        if (proofErr) throw new Error(proofErr.message);
        proofPath = proofName;
      }

      // Insert expense_report
      const { data: report, error: reportErr } = await supabase
        .from("expense_reports")
        .insert({
          application_id: applicationId,
          applicant_id: applicantId,
          total_claimed: Math.round(total * 100) / 100,
          proof_of_attendance_path: proofPath,
          notes: notes.trim() || null,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (reportErr) throw new Error(reportErr.message);

      // Insert all receipt rows
      const receiptRows = receipts.map((r) => ({
        expense_report_id: report.id,
        storage_path: r.storagePath,
        file_name: r.fileName,
        content_hash: r.contentHash,
        amount: parseFloat(r.amount),
        currency: r.currency,
        expense_date: r.expenseDate || null,
        category: r.category,
        ocr_confidence: r.ocrConfidence,
        ocr_raw: { field_confidences: r.fieldConfidences, validation_warnings: r.validationWarnings },
        is_duplicate_suspect: r.isDuplicateSuspect,
        is_manually_verified: r.isManuallyOverridden,
      }));

      const { error: receiptsErr } = await supabase.from("receipts").insert(receiptRows);
      if (receiptsErr) throw new Error(receiptsErr.message);

      // Transition application to report_submitted
      const { error: appErr } = await supabase
        .from("applications")
        .update({ status: "report_submitted" })
        .eq("id", applicationId);
      if (appErr) throw new Error(appErr.message);

      router.push("/applicant");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Настана грешка при поднесувањето.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Deadline banner */}
      {daysLeft !== null && daysLeft <= 7 && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
            daysLeft <= 2
              ? "bg-red-50 border border-red-200 text-red-800"
              : "bg-yellow-50 border border-yellow-200 text-yellow-800"
          }`}
        >
          <span className="text-base">{daysLeft <= 2 ? "🚨" : "⚠️"}</span>
          <span>
            {daysLeft <= 0
              ? "Рокот за поднесување истече."
              : `Рок за поднесување: уште ${daysLeft} ${daysLeft === 1 ? "ден" : "дена"} (${applicationContext.reportDeadline}).`}
          </span>
        </div>
      )}

      {/* Receipts section */}
      <section className="border border-border rounded-lg bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Рецепти</h2>
          {receipts.length > 0 && (
            <span className="text-sm font-mono font-semibold">
              Вкупно: {total.toLocaleString("mk-MK", { minimumFractionDigits: 2 })} МКД
            </span>
          )}
        </div>

        <ReceiptUploader
          applicationId={applicationId}
          applicationContext={{
            travelStartDate: applicationContext.travelStartDate,
            travelEndDate: applicationContext.travelEndDate,
            approvedAmount: applicationContext.approvedAmount,
          }}
          existingHashes={existingHashes}
          onReceiptAdded={handleReceiptAdded}
        />

        {receipts.length > 0 && (
          <div className="space-y-3 pt-1">
            {receipts.map((r) => (
              <ReceiptCard
                key={r.localId}
                receipt={r}
                onChange={handleReceiptChange}
                onRemove={handleReceiptRemove}
              />
            ))}
          </div>
        )}

        {receipts.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Нема прикачени рецепти.
          </p>
        )}
      </section>

      {/* Proof of attendance */}
      <section className="border border-border rounded-lg bg-card p-5 space-y-3">
        <h2 className="text-base font-semibold">Доказ за присуство</h2>
        <p className="text-xs text-muted-foreground">
          Сертификат за учество, значка или потпишана програма. Незадолжително, но препорачано.
        </p>
        {proofFile ? (
          <div className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-md">
            <span className="text-sm truncate">{proofFile.name}</span>
            <button
              type="button"
              onClick={() => {
                setProofFile(null);
                if (proofInputRef.current) proofInputRef.current.value = "";
              }}
              className="text-xs text-muted-foreground hover:text-destructive ml-3 shrink-0"
            >
              Отстрани
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => proofInputRef.current?.click()}
            className="px-4 py-2 border border-dashed border-border rounded-md text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors w-full"
          >
            + Прикачи доказ за присуство
          </button>
        )}
        <input
          ref={proofInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleProofFile}
        />
      </section>

      {/* Notes */}
      <section className="border border-border rounded-lg bg-card p-5 space-y-2">
        <label htmlFor="report-notes" className="text-base font-semibold">
          Напомени
        </label>
        <textarea
          id="report-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Дополнителни информации за трошоците, посебни околности…"
          className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </section>

      {/* Summary & submit */}
      <section className="border border-border rounded-lg bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Преглед</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Одобрен аванс</dt>
            <dd className="font-mono font-medium">
              {applicationContext.approvedAmount.toLocaleString("mk-MK")} МКД
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              Вкупно потраћено ({receipts.filter((r) => r.ocrStatus === "done").length} рецепти)
            </dt>
            <dd className="font-mono font-medium">
              {total.toLocaleString("mk-MK", { minimumFractionDigits: 2 })} МКД
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <dt className="text-muted-foreground">Разлика</dt>
            <dd
              className={`font-mono font-semibold ${
                total - applicationContext.approvedAmount > 0
                  ? "text-green-700"
                  : total - applicationContext.approvedAmount < 0
                  ? "text-red-600"
                  : ""
              }`}
            >
              {(total - applicationContext.approvedAmount).toLocaleString("mk-MK", {
                minimumFractionDigits: 2,
                signDisplay: "always",
              })}{" "}
              МКД
            </dd>
          </div>
        </dl>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || receipts.some((r) => r.ocrStatus === "uploading" || r.ocrStatus === "ocr_processing")}
          className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Се поднесува…
            </>
          ) : (
            "Поднеси извештај"
          )}
        </button>
        <p className="text-xs text-muted-foreground text-center">
          По поднесувањето, апликацијата влегува во статус Извештај поднесен.
        </p>
      </section>
    </form>
  );
}
