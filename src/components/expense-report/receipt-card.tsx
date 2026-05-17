"use client";

import type { ExpenseCategory } from "@/types/database.types";
import { confidenceColor, confidenceMeta } from "@/lib/ocr-validation";

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  accommodation: "Сместување",
  transport: "Транспорт",
  registration_fee: "Котизација",
  meals: "Оброци",
  other: "Друго",
};

const CURRENCIES = ["MKD", "EUR", "USD", "GBP", "CHF"];

export interface ReceiptData {
  localId: string;
  fileName: string;
  fileSize: number;
  storagePath: string;
  contentHash: string;
  amount: string;
  currency: string;
  expenseDate: string;
  category: ExpenseCategory;
  ocrConfidence: number;
  fieldConfidences: {
    amount: number;
    currency: number;
    date: number;
    category: number;
  };
  validationWarnings: Partial<Record<string, string>>;
  isDuplicateSuspect: boolean;
  isManuallyOverridden: boolean;
  ocrStatus: "uploading" | "ocr_processing" | "done" | "error";
  uploadError?: string;
}

interface Props {
  receipt: ReceiptData;
  onChange: (localId: string, patch: Partial<ReceiptData>) => void;
  onRemove: (localId: string) => void;
}

function ConfidenceBar({
  label,
  score,
  warning,
}: {
  label: string;
  score: number;
  warning?: string;
}) {
  const meta = confidenceMeta(score);
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-muted-foreground shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${confidenceColor(score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`w-14 text-right font-mono shrink-0 ${meta.textColor}`}>
        {pct}% {meta.label}
      </span>
      {warning && (
        <span className="text-yellow-600" title={warning}>
          ⚠
        </span>
      )}
    </div>
  );
}

export default function ReceiptCard({ receipt, onChange, onRemove }: Props) {
  const isProcessing =
    receipt.ocrStatus === "uploading" || receipt.ocrStatus === "ocr_processing";

  function handleField<K extends keyof ReceiptData>(key: K, value: ReceiptData[K]) {
    onChange(receipt.localId, { [key]: value, isManuallyOverridden: true } as Partial<ReceiptData>);
  }

  const fileSizeLabel =
    receipt.fileSize < 1024 * 1024
      ? `${(receipt.fileSize / 1024).toFixed(0)} KB`
      : `${(receipt.fileSize / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div
      className={`border rounded-lg bg-card p-4 space-y-3 ${
        receipt.isDuplicateSuspect
          ? "border-orange-300"
          : receipt.ocrStatus === "error"
          ? "border-destructive/50"
          : "border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{receipt.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {fileSizeLabel}
            {receipt.contentHash && (
              <> &middot; SHA-256: <span className="font-mono">{receipt.contentHash.slice(0, 8)}…</span></>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(receipt.localId)}
          disabled={isProcessing}
          className="shrink-0 text-xs text-muted-foreground hover:text-destructive disabled:opacity-40 transition-colors"
          aria-label="Отстрани"
        >
          ✕
        </button>
      </div>

      {/* Duplicate warning */}
      {receipt.isDuplicateSuspect && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-md text-xs text-orange-800">
          <span>⚠</span>
          <span>
            Потенцијален дупликат — SHA-256 хешот постои во друг рецепт. Потврдете рачно.
          </span>
        </div>
      )}

      {/* Loading states */}
      {receipt.ocrStatus === "uploading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-3 h-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin inline-block" />
          Се прикачува…
        </div>
      )}

      {receipt.ocrStatus === "ocr_processing" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin inline-block" />
          OCR обработка…
        </div>
      )}

      {receipt.ocrStatus === "error" && (
        <p className="text-xs text-destructive">{receipt.uploadError ?? "Грешка при обработка"}</p>
      )}

      {receipt.ocrStatus === "done" && (
        <>
          {/* OCR confidence breakdown */}
          <div className="rounded-md bg-muted/40 px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium">OCR доверливост</p>
              <span
                className={`text-xs font-semibold ${confidenceMeta(receipt.ocrConfidence).textColor}`}
              >
                {Math.round(receipt.ocrConfidence * 100)}% вкупно
              </span>
            </div>
            <ConfidenceBar
              label="Износ"
              score={receipt.fieldConfidences.amount}
              warning={receipt.validationWarnings.amount}
            />
            <ConfidenceBar
              label="Валута"
              score={receipt.fieldConfidences.currency}
              warning={receipt.validationWarnings.currency}
            />
            <ConfidenceBar
              label="Датум"
              score={receipt.fieldConfidences.date}
              warning={receipt.validationWarnings.expense_date}
            />
            <ConfidenceBar
              label="Категорија"
              score={receipt.fieldConfidences.category}
            />
          </div>

          {/* Editable fields */}
          <div className="grid grid-cols-2 gap-3">
            {/* Amount */}
            <div className="space-y-1">
              <label className="text-xs font-medium flex items-center gap-1">
                Износ <span className="text-destructive">*</span>
                {receipt.validationWarnings.amount && (
                  <span
                    className="text-yellow-600 cursor-help"
                    title={receipt.validationWarnings.amount}
                  >
                    ⚠
                  </span>
                )}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={receipt.amount}
                onChange={(e) => handleField("amount", e.target.value)}
                className="w-full px-2 py-1.5 border border-input rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              />
            </div>

            {/* Currency */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Валута</label>
              <select
                value={receipt.currency}
                onChange={(e) => handleField("currency", e.target.value)}
                className="w-full px-2 py-1.5 border border-input rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="space-y-1">
              <label className="text-xs font-medium flex items-center gap-1">
                Датум
                {receipt.validationWarnings.expense_date && (
                  <span
                    className="text-yellow-600 cursor-help"
                    title={receipt.validationWarnings.expense_date}
                  >
                    ⚠
                  </span>
                )}
              </label>
              <input
                type="date"
                value={receipt.expenseDate}
                onChange={(e) => handleField("expenseDate", e.target.value)}
                className="w-full px-2 py-1.5 border border-input rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Категорија</label>
              <select
                value={receipt.category}
                onChange={(e) =>
                  handleField("category", e.target.value as ExpenseCategory)
                }
                className="w-full px-2 py-1.5 border border-input rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {(Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][]).map(
                  ([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Manual override indicator */}
          {receipt.isManuallyOverridden && (
            <p className="text-xs text-muted-foreground italic">
              Полиња рачно коригирани — ќе бидат означени за верификација.
            </p>
          )}
        </>
      )}
    </div>
  );
}
