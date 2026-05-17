import type { ExpenseCategory } from "@/types/database.types";

export interface OcrFields {
  amount: number | null;
  currency: string;
  expense_date: string | null;
  category: ExpenseCategory;
}

export interface ApplicationContext {
  travelStartDate: string;
  travelEndDate: string;
  approvedAmount: number;
}

export interface ValidationResult {
  warnings: Partial<Record<"amount" | "currency" | "expense_date" | "category", string>>;
  isValid: boolean;
}

const KNOWN_CURRENCIES = ["MKD", "EUR", "USD", "GBP", "CHF", "HRK", "RSD", "ALL", "BGN", "RON"];

export function validateOcrFields(
  fields: OcrFields,
  context: ApplicationContext
): ValidationResult {
  const warnings: ValidationResult["warnings"] = {};

  if (fields.amount !== null) {
    if (fields.amount <= 0) {
      warnings.amount = "Износот мора да биде позитивен";
    } else if (fields.amount > context.approvedAmount * 2) {
      warnings.amount = `Износот е значително над одобрениот (${context.approvedAmount.toLocaleString("mk-MK")} МКД)`;
    }
  }

  if (fields.currency && !KNOWN_CURRENCIES.includes(fields.currency.toUpperCase())) {
    warnings.currency = `Непозната валута: ${fields.currency}`;
  }

  if (fields.expense_date) {
    const expDate = new Date(fields.expense_date);
    const rangeStart = new Date(context.travelStartDate);
    rangeStart.setDate(rangeStart.getDate() - 1);
    const rangeEnd = new Date(context.travelEndDate);
    rangeEnd.setDate(rangeEnd.getDate() + 2);

    if (expDate < rangeStart || expDate > rangeEnd) {
      warnings.expense_date = `Датумот е надвор од периодот на патување (${context.travelStartDate} – ${context.travelEndDate})`;
    }
  }

  return { warnings, isValid: Object.keys(warnings).length === 0 };
}

export function confidenceColor(score: number): string {
  if (score >= 0.85) return "bg-green-500";
  if (score >= 0.65) return "bg-yellow-400";
  return "bg-red-500";
}

export function confidenceMeta(score: number): { label: string; textColor: string } {
  if (score >= 0.85) return { label: "Висока", textColor: "text-green-700" };
  if (score >= 0.65) return { label: "Средна", textColor: "text-yellow-700" };
  return { label: "Ниска", textColor: "text-red-600" };
}
