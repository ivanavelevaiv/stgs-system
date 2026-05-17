"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  { label: string; description: string; color: string }
> = {
  refund_to_applicant: {
    label: "Доплата кон апликантот",
    description: "Трошоците го надминуваат авансот — ФИНКИ должи разлика",
    color: "text-green-700 bg-green-50 border-green-200",
  },
  return_to_finki: {
    label: "Апликантот враќа средства",
    description: "Трошоците се помали од авансот — апликантот враќа разлика",
    color: "text-orange-700 bg-orange-50 border-orange-200",
  },
  balanced: {
    label: "Порамнето",
    description: "Трошоците го покриваат авансот — без дополнителна исплата",
    color: "text-blue-700 bg-blue-50 border-blue-200",
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

    router.push("/accounting");
    router.refresh();
  }

  const dirMeta = DIRECTION_META[direction];

  return (
    <div className="space-y-6">
      {/* ── Duplicate suspect queue ── */}
      {duplicates.length > 0 && (
        <section className="border border-border rounded-lg bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Потенцијални дупликати</h2>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                hasUnresolvedDuplicates
                  ? "bg-orange-100 text-orange-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {duplicates.filter((r) => !r.is_manually_verified).length} нерешени
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Рецептите подолу имаат исти SHA-256 хаш со друг рецепт. Потврдете ги
            легитимните или оставете ги за исклучување од порамнувањето.
          </p>
          <ul className="divide-y divide-border">
            {duplicates.map((r) => (
              <li
                key={r.id}
                className={`py-3 flex items-center gap-4 ${
                  r.is_manually_verified ? "opacity-60" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[r.category] ?? r.category}
                    {r.expense_date ? ` · ${r.expense_date}` : ""}
                    {" · OCR "}
                    {Math.round((r.ocr_confidence ?? 0) * 100)}%
                  </p>
                </div>
                <span className="text-sm font-mono font-medium shrink-0">
                  {Number(r.amount ?? 0).toLocaleString("mk-MK")} {r.currency}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {r.is_manually_verified ? (
                    <>
                      <span className="text-xs text-green-700 font-medium">✓ Потврден</span>
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
                        className="px-2.5 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition-colors"
                      >
                        Потврди
                      </button>
                      <span className="text-xs text-orange-600 font-medium">
                        Ќе се исклучи
                      </span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Settlement calculator ── */}
      <section className="border border-border rounded-lg bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Пресметка на порамнување</h2>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Исплатен аванс</span>
            <span className="font-mono font-semibold">
              {advanceAmount.toLocaleString("mk-MK")} МКД
            </span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-muted-foreground">
              Верификувани рецепти ({included.length})
            </span>
            <span className="font-mono">
              {claimedAmount.toLocaleString("mk-MK", { minimumFractionDigits: 2 })} МКД
            </span>
          </div>

          {excluded.length > 0 && (
            <div className="flex justify-between py-1 text-orange-700">
              <span>
                Исклучени дупликати ({excluded.length})
              </span>
              <span className="font-mono">
                −{excluded
                  .reduce((s, r) => s + (r.amount ?? 0), 0)
                  .toLocaleString("mk-MK", { minimumFractionDigits: 2 })}{" "}
                МКД
              </span>
            </div>
          )}

          <div className="flex justify-between py-2 border-t border-border font-semibold">
            <span>Признаени трошоци</span>
            <span className="font-mono">
              {claimedAmount.toLocaleString("mk-MK", { minimumFractionDigits: 2 })} МКД
            </span>
          </div>

          <div
            className={`flex justify-between py-2 rounded-md px-3 font-bold text-base border ${dirMeta.color}`}
          >
            <span>Разлика</span>
            <span className="font-mono">
              {difference.toLocaleString("mk-MK", {
                minimumFractionDigits: 2,
                signDisplay: "always",
              })}{" "}
              МКД
            </span>
          </div>
        </div>

        <div className={`rounded-lg border p-4 space-y-1 ${dirMeta.color}`}>
          <p className="text-sm font-semibold">{dirMeta.label}</p>
          <p className="text-xs">{dirMeta.description}</p>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
            {error}
          </p>
        )}

        {/* Action buttons */}
        {!existingSettlement ? (
          <button
            type="button"
            onClick={handleConfirmSettlement}
            disabled={submitting}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
            <div className="rounded-md bg-orange-50 border border-orange-200 px-4 py-3 text-sm text-orange-800">
              Порамнувањето е потврдено — апликантот треба да врати{" "}
              <strong>
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
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            ✓ Порамнувањето е завршено и апликацијата е затворена.
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Потврдува: {accountantName}
        </p>
      </section>

      {/* ── All receipts reference ── */}
      <section className="border border-border rounded-lg bg-card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Сите рецепти ({receipts.length})
        </h2>
        <ul className="divide-y divide-border">
          {receipts.map((r) => (
            <li key={r.id} className="py-2.5 flex items-center gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium truncate ${
                    r.is_duplicate_suspect && !r.is_manually_verified
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                >
                  {r.file_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORY_LABELS[r.category] ?? r.category}
                  {r.expense_date ? ` · ${r.expense_date}` : ""}
                  {r.is_duplicate_suspect && (
                    <span
                      className={`ml-2 ${
                        r.is_manually_verified ? "text-green-600" : "text-orange-600"
                      }`}
                    >
                      {r.is_manually_verified ? "✓ Потврден" : "⚠ Дупликат"}
                    </span>
                  )}
                </p>
              </div>
              <span className="font-mono text-right shrink-0">
                {Number(r.amount ?? 0).toLocaleString("mk-MK")} {r.currency}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
