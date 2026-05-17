import { NextRequest, NextResponse } from "next/server";
import type { ExpenseCategory } from "@/types/database.types";

interface OcrRequest {
  storagePath: string;
  fileName: string;
  fileSize: number;
  applicationContext: {
    travelStartDate: string;
    travelEndDate: string;
    approvedAmount: number;
  };
}

// Deterministic pseudo-random seeded on a string
function seededRng(seed: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  let state = h || 1;
  return function next(): number {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return ((state >>> 0) % 10000) / 10000;
  };
}

const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  accommodation: ["hotel", "accommodation", "stay", "lodge", "hostel", "motel", "inn"],
  transport: ["flight", "taxi", "bus", "train", "transport", "uber", "transfer", "car", "rental"],
  registration_fee: ["registration", "fee", "conference", "reg", "ticket", "entry"],
  meals: ["restaurant", "lunch", "dinner", "food", "meal", "cafe", "breakfast"],
  other: [],
};

function guessCategory(fileName: string, rand: () => number): ExpenseCategory {
  const lower = fileName.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return cat as ExpenseCategory;
    }
  }
  const cats: ExpenseCategory[] = ["accommodation", "transport", "registration_fee", "meals", "other"];
  return cats[Math.floor(rand() * 4)];
}

export async function POST(request: NextRequest) {
  const body: OcrRequest = await request.json();
  const { storagePath, fileName, fileSize, applicationContext } = body;

  const rand = seededRng(storagePath + fileName);

  const category = guessCategory(fileName, rand);

  // Plausible amount proportional to approved budget and category
  const ratioRange: Record<ExpenseCategory, [number, number]> = {
    accommodation: [0.15, 0.45],
    transport: [0.07, 0.22],
    registration_fee: [0.10, 0.30],
    meals: [0.02, 0.09],
    other: [0.02, 0.07],
  };
  const [lo, hi] = ratioRange[category];
  const ratio = lo + rand() * (hi - lo);
  const amount = Math.round(applicationContext.approvedAmount * ratio * 100) / 100;

  // Date somewhere in the travel window
  const startMs = new Date(applicationContext.travelStartDate).getTime();
  const endMs = new Date(applicationContext.travelEndDate).getTime();
  const span = Math.max(endMs - startMs, 0);
  const expense_date = new Date(startMs + rand() * span).toISOString().split("T")[0];

  const currency = rand() > 0.3 ? "MKD" : "EUR";

  // Confidence is higher for larger (better quality) files, with per-field variance
  const baseConf = Math.min(0.95, 0.55 + fileSize / (6 * 1024 * 1024));
  const field_confidences = {
    amount: Math.min(0.99, Number((baseConf + rand() * 0.18).toFixed(2))),
    currency: Math.min(0.99, Number((baseConf + 0.08 + rand() * 0.1).toFixed(2))),
    date: Math.min(0.99, Number((baseConf - 0.05 + rand() * 0.22).toFixed(2))),
    category: Math.min(0.99, Number((baseConf - 0.08 + rand() * 0.2).toFixed(2))),
  };
  const ocr_confidence = Number(
    (Object.values(field_confidences).reduce((a, b) => a + b, 0) / 4).toFixed(2)
  );

  return NextResponse.json({
    amount,
    currency,
    expense_date,
    category,
    ocr_confidence,
    field_confidences,
    ocr_raw: {
      engine: "process-ocr/v1-simulate",
      processed_at: new Date().toISOString(),
      storage_path: storagePath,
      field_confidences,
      raw_text_excerpt: `[OCR simulation — ${fileName} — ${fileSize} bytes]`,
    },
  });
}
