import type { ApplicationStatus } from "@/types/database.types";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Нацрт",
  submitted: "Поднесена",
  under_review_council: "Под преглед — Совет",
  under_review_deanery: "Под преглед — Деканат",
  approved: "Одобрена",
  partially_approved: "Делумно одобрена",
  rejected: "Одбиена",
  for_payment: "За исплата",
  paid: "Исплатена",
  report_submitted: "Извештај поднесен",
  in_settlement: "Во порамнување",
  closed: "Затворена",
};

export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800",
  under_review_council: "bg-yellow-100 text-yellow-800",
  under_review_deanery: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  partially_approved: "bg-orange-100 text-orange-800",
  rejected: "bg-red-100 text-red-800",
  for_payment: "bg-purple-100 text-purple-800",
  paid: "bg-green-100 text-green-800",
  report_submitted: "bg-blue-100 text-blue-800",
  in_settlement: "bg-yellow-100 text-yellow-800",
  closed: "bg-muted text-muted-foreground",
};
