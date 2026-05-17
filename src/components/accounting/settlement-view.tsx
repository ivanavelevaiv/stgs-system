"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications";
import type { Database } from "@/types/database.types";

type SettlementDirection = Database["public"]["Enums"]["settlement_direction"];

const CATEGORY_LABELS: Record<string, string> = {
  accommodation: "Сместување",
  transport: "Транспорт",
  registration_fee: "Котизација",
  meals: "Оброци",
  other: "Друго",
};

const DIRECTION_META: Record<
  SettlementDirection,
  { label: string; description: string; cardCls: string; diffCls: string }
> = {
  refund_to_applicant: {
    label: "Доплата кон апликантот",
    description: "Трошоците го надминуваат авансот — ФИНКИ должи разлика",
    cardCls: "bg-emerald-50 border-emerald-200 text-emerald-800",
    diffCls: "text-emerald-700",
  },
  return_to_finki: {
    label: "Апликантот враќа средства",
    description: "Трошоците се помали од авансот — апликантот враќа разлика",
    cardCls: "bg-orange-50 border-orange-200 text-orange-800",
    diffCls: "text-orange-700",
  },
  balanced: {
    label: "Порамнето",
    description: "Трошоците го покриваат авансот — без дополнителна исплата",
    cardCls: "bg-blue-50 border-blue-200 text-blue-800",
    diffCls: "text-blue-700",
  },
};

export interface ReceiptRow {
  id: string;
  file_name: string;
  amount: number | null;
  currency: string;
  expense_date: string | null;
  category: string;
  ocr_confidence: number | null;
  is_duplicate_suspect: boolean;
  is_manually_verified: boolean;
}

interface Props {
  applicationId: string;
  applicantId: string;
  advanceAmount: number;
  initialReceipts: ReceiptRow[];
  accountantId: string;
  accountantName: string;
  existingSettlement: {
    id: string;
    direction: SettlementDirection;
    status: string;
    claimed_amount: number;
    difference: number | null;
  } | null;
}

function calcSettlement(
  receipts: ReceiptRow[],
  advanceAmount: number
): {
  included: ReceiptRow[];
  excluded: ReceiptRow[];
  claimedAmount: number;
  difference: number;
  direction: SettlementDirection;
} {
  const included = receipts.filter(
    (r) => !r.is_duplicate_suspect || r.is_manually_verified
  );
  const excluded = receipts.filter(
    (r) => r.is_duplicate_suspect && !r.is_manually_verified
  );
  const claimedAmount = included.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const difference = claimedAmount - advanceAmount;
  const direction: SettlementDirection =
    difference > 0.5
      ? "refund_to_applicant"
      : difference < -0.5
      ? "return_to_finki"
      : "balanced";
  return { included, excluded, claimedAmount, difference, direction };
}

export default function SettlementView({
  applicationId,
  applicantId,
  advanceAmount,
  initialReceipts,
  accountantId,
  accountantName,
  existingSettlement,
}: Props) {
  const router = useRouter();
  const [receipts, setReceipts] = useState<ReceiptRow[]>(initialReceipts);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { included, excluded, claimedAmount, difference, direction } =
    calcSettlement(receipts, advanceAmount);
  const duplicates = receipts.filter((r) => r.is_duplicate_suspect);
  const hasUnresolvedDuplicates = duplicates.some((r) => !r.is_manually_verified);

  async function handleVerifyReceipt(receiptId: string, verify: boolean) {
    const supabase = createClient();
    const { error: err } = await supabase
      .from("receipts")
      .update({ is_manually_verified: verify })
      .eq("id", receiptId);
    if (err) {
      setError(err.message);
      return;
    }
    setReceipts((prev) =>
      prev.map((r) =>
        r.id === receiptId ? { ...r, is_manually_verified: verify } : r
      )
    );
  }

  async function handleConfirmSettlement() {
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();

      const { error: settlErr } = await supabase.from("settlements").insert({
        application_id: applicationId,
        advance_amount: advanceAmount,
        claimed_amount: Math.round(claimedAmount * 100) / 100,
        difference: Math.round(difference * 100) / 100,
        direction,
        status: direction === "return_to_finki" ? "awaiting_proof" : "completed",
        processed_by: accountantId,
        processed_at: new Date().toISOString(),
      });
      if (settlErr) throw settlErr;

      if (direction !== "return_to_finki") {
        await doClose(supabase);
      } else {
        const { error: appErr } = await supabase
          .from("applications")
          .update({ status: "in_settlement" })
          .eq("id", applicationId);
        if (appErr) throw appErr;

        await createNotification({
          recipientId: applicantId,
          applicationId,
          type: "settlement_complete",
          title: "Потребно враќање на средства",
          body: `Трошоците се помали од авансот. Потребно е да вратите ${Math.abs(difference).toLocaleString("mk-MK", { minimumFractionDigits: 2 })} МКД во ФИНКИ.`,
        });

        router.push("/accounting");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Грешка при порамнување.");
      setSubmitting(false);
    }
  }

  async function handleCloseApplication() {
    setClosing(true);
    setError(null);
    try {
      const supabase = createClient();

      if (existingSettlement) {
        const { error: settlErr } = await supabase
          .from("settlements")
          .update({ status: "completed" })
          .eq("id", existingSettlement.id);
        if (settlErr) throw settlErr;
      }

      await doClose(supabase);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Грешка при затворање.");
      setClosing(false);
    }
  }

  async function doClose(supabase: ReturnType<typeof createClient>) {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .not("archive_number", "is", null);
    const archiveNumber = `СТГС-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { error: appErr } = await supabase
      .from("applications")
      .update({ status: "closed", archive_number: archiveNumber })
      .eq("id", applicationId);
    if (appErr) throw appErr;

    await createNotification({
      recipientId: applicantId,
      applicationId,
      type: "settlement_complete",
      title: "Апликацијата е затворена",
      body: `Порамнувањето е финализирано. Архивски број: ${archiveNumber}.`,
    });

    router.push("/accounting");
    router.refresh();
  }

  const dirMeta = DIRECTION_META[direction];
  const unresolvedCount = duplicates.filter((r) => !r.is_manually_verified).length;

  return (
    <div className="space-y-6">
      {/* ── Duplicate suspect banner (gradient border) ── */}
      {duplicates.length > 0 && (
        <div className="p-[1px] rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 shadow-lg shadow-amber-500/20">
          <div className="bg-card rounded-[15px] p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-lg shrink-0 select-none">
                ⚠️
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-foreground">
                  Потенцијални дупликати
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Рецептите подолу имаат исти SHA-256 хаш со друг рецепт. Потврдете
                  ги легитимните или оставете ги за исклучување.
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  hasUnresolvedDuplicates
                    ? "bg-amber-100 text-amber-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {unresolvedCount} нерешени
              </span>
            </div>

            {/* Receipt rows */}
            <div className="rounded-xl overflow-hidden border border-border/60 divide-y divide-border/60">
              {duplicates.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    r.is_manually_verified
                      ? "bg-emerald-50/50"
                      : "bg-amber-50/40 hover:bg-amber-50/70"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${
                        r.is_manually_verified ? "" : "text-amber-900"
                      }`}
                    >
                      {r.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {CATEGORY_LABELS[r.category] ?? r.category}
                      {r.expense_date ? ` · ${r.expense_date}` : ""}
                      {" · OCR "}
                      {Math.round((r.ocr_confidence ?? 0) * 100)}%
                    </p>
                  </div>
                  <span className="text-sm font-mono font-semibold tabular-nums shrink-0">
                    {Number(r.amount ?? 0).toLocaleString("mk-MK")} {r.currency}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.is_manually_verified ? (
                      <>
                        <span className="text-xs font-semibold text-emerald-700">
                          ✓ Потврден
                        </span>
                        <button
                          type="button"
                          onClick={() => handleVerifyReceipt(r.id, false)}
                          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                        >
                          Откажи
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleVerifyReceipt(r.id, true)}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 hover:scale-[1.03] active:scale-[0.97] transition-all shadow-sm"
                        >
                          Потврди
                        </button>
                        <span className="text-xs font-medium text-orange-600">
                          Ќе се исклучи
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Settlement calculator ── */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <h2 className="text-base font-bold">Пресметка на порамнување</h2>

        {/* Ledger */}
        <div className="rounded-xl overflow-hidden border border-border/60">
          <div className="flex justify-between items-center px-4 py-3 bg-muted/20 border-b border-border/60">
            <span className="text-sm text-muted-foreground">Исплатен аванс</span>
            <span className="text-sm font-bold font-mono tabular-nums">
              {advanceAmount.toLocaleString("mk-MK")} МКД
            </span>
          </div>

          <div className="flex justify-between items-center px-4 py-3 border-b border-border/60">
            <span className="text-sm text-muted-foreground">
              Верификувани рецепти ({included.length})
            </span>
            <span className="text-sm font-mono tabular-nums">
              {claimedAmount.toLocaleString("mk-MK", { minimumFractionDigits: 2 })} МКД
            </span>
          </div>

          {excluded.length > 0 && (
            <div className="flex justify-between items-center px-4 py-3 border-b border-border/60 bg-orange-50/50">
              <span className="text-sm text-orange-700">
                Исклучени дупликати ({excluded.length})
              </span>
              <span className="text-sm font-mono tabular-nums text-orange-700">
                −
                {excluded
                  .reduce((s, r) => s + (r.amount ?? 0), 0)
                  .toLocaleString("mk-MK", { minimumFractionDigits: 2 })}{" "}
                МКД
              </span>
            </div>
          )}

          {/* Difference row — prominent */}
          <div
            className={`flex justify-between items-center px-4 py-4 border-t-2 border-border/80 ${
              direction === "balanced"
                ? "bg-blue-50/40"
                : direction === "refund_to_applicant"
                ? "bg-emerald-50/40"
                : "bg-orange-50/40"
            }`}
          >
            <span className={`text-base font-bold ${dirMeta.diffCls}`}>
              Разлика
            </span>
            <span className={`text-lg font-extrabold font-mono tabular-nums ${dirMeta.diffCls}`}>
              {difference.toLocaleString("mk-MK", {
                minimumFractionDigits: 2,
                signDisplay: "always",
              })}{" "}
              МКД
            </span>
          </div>
        </div>

        {/* Direction summary card */}
        <div className={`rounded-xl border p-4 ${dirMeta.cardCls}`}>
          <p className="text-sm font-bold mb-0.5">{dirMeta.label}</p>
          <p className="text-xs opacity-80">{dirMeta.description}</p>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* Action buttons */}
        {!existingSettlement ? (
          <button
            type="button"
            onClick={handleConfirmSettlement}
            disabled={submitting}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Се потврдува…
              </>
            ) : direction === "return_to_finki" ? (
              "Потврди порамнување (чека враќање)"
            ) : (
              "Потврди порамнување и затвори"
            )}
          </button>
        ) : existingSettlement.status === "awaiting_proof" ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-orange-50 border border-orange-200 px-4 py-3.5 text-sm text-orange-800">
              Порамнувањето е потврдено — апликантот треба да врати{" "}
              <strong className="font-bold">
                {Math.abs(difference).toLocaleString("mk-MK", {
                  minimumFractionDigits: 2,
                })}{" "}
                МКД
              </strong>{" "}
              во ФИНКИ.
            </div>
            <button
              type="button"
              onClick={handleCloseApplication}
              disabled={closing}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
            >
              {closing ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Се затвора…
                </>
              ) : (
                "Потврди враќање и затвори апликацијата"
              )}
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3.5 text-sm text-emerald-800 font-medium">
            ✓ Порамнувањето е завршено и апликацијата е затворена.
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Потврдува: {accountantName}
        </p>
      </div>

      {/* ── All receipts reference ── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/20">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Сите рецепти ({receipts.length})
          </h2>
        </div>
        <div className="divide-y divide-border">
          {receipts.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    r.is_duplicate_suspect && !r.is_manually_verified
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                >
                  {r.file_name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {CATEGORY_LABELS[r.category] ?? r.category}
                  {r.expense_date ? ` · ${r.expense_date}` : ""}
                  {r.is_duplicate_suspect && (
                    <span
                      className={`ml-2 font-medium ${
                        r.is_manually_verified ? "text-emerald-600" : "text-orange-600"
                      }`}
                    >
                      {r.is_manually_verified ? "✓ Потврден" : "⚠ Дупликат"}
                    </span>
                  )}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold tabular-nums shrink-0">
                {Number(r.amount ?? 0).toLocaleString("mk-MK")} {r.currency}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
