"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ReceiptData } from "./receipt-card";
import type { ExpenseCategory } from "@/types/database.types";
import { validateOcrFields } from "@/lib/ocr-validation";

const ACCEPTED_MIME = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

interface Props {
  applicationId: string;
  applicationContext: {
    travelStartDate: string;
    travelEndDate: string;
    approvedAmount: number;
  };
  existingHashes: string[];
  onReceiptAdded: (receipt: ReceiptData) => void;
}

async function computeSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function ReceiptUploader({
  applicationId,
  applicationContext,
  existingHashes,
  onReceiptAdded,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  async function processFile(file: File) {
    setFileError(null);

    if (!ACCEPTED_MIME.includes(file.type)) {
      setFileError(`Неподдржан формат: ${file.name}. Прифаќа само PDF, JPG, PNG.`);
      return;
    }
    if (file.size > MAX_SIZE) {
      setFileError(`${file.name} е поголем од 10 MB.`);
      return;
    }

    const localId = crypto.randomUUID();

    // Announce receipt immediately with "uploading" state
    const placeholder: ReceiptData = {
      localId,
      fileName: file.name,
      fileSize: file.size,
      storagePath: "",
      contentHash: "",
      amount: "",
      currency: "MKD",
      expenseDate: applicationContext.travelStartDate,
      category: "other",
      ocrConfidence: 0,
      fieldConfidences: { amount: 0, currency: 0, date: 0, category: 0 },
      validationWarnings: {},
      isDuplicateSuspect: false,
      isManuallyOverridden: false,
      ocrStatus: "uploading",
    };
    onReceiptAdded(placeholder);

    try {
      // 1. Compute SHA-256
      const hash = await computeSha256(file);

      // 2. Upload to Supabase Storage
      const supabase = createClient();
      const storageName = `${applicationId}/${Date.now()}_${localId.slice(0, 8)}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("receipts")
        .upload(storageName, file);
      if (uploadErr) throw new Error(uploadErr.message);

      // 3. Duplicate check against hashes already in this session
      const isDuplicateSuspect = existingHashes.includes(hash);

      // Transition to OCR processing
      onReceiptAdded({
        ...placeholder,
        storagePath: storageName,
        contentHash: hash,
        isDuplicateSuspect,
        ocrStatus: "ocr_processing",
      });

      // 4. Call OCR simulation endpoint
      const ocrRes = await fetch("/api/ocr-simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: storageName,
          fileName: file.name,
          fileSize: file.size,
          applicationContext,
        }),
      });
      if (!ocrRes.ok) throw new Error("OCR endpoint failed");

      const ocr = await ocrRes.json() as {
        amount: number;
        currency: string;
        expense_date: string;
        category: ExpenseCategory;
        ocr_confidence: number;
        field_confidences: { amount: number; currency: number; date: number; category: number };
        ocr_raw: unknown;
      };

      // 5. Validate OCR fields against travel context
      const validation = validateOcrFields(
        {
          amount: ocr.amount,
          currency: ocr.currency,
          expense_date: ocr.expense_date,
          category: ocr.category,
        },
        applicationContext
      );

      const finished: ReceiptData = {
        localId,
        fileName: file.name,
        fileSize: file.size,
        storagePath: storageName,
        contentHash: hash,
        amount: String(ocr.amount ?? ""),
        currency: ocr.currency,
        expenseDate: ocr.expense_date ?? applicationContext.travelStartDate,
        category: ocr.category,
        ocrConfidence: ocr.ocr_confidence,
        fieldConfidences: ocr.field_confidences,
        validationWarnings: validation.warnings,
        isDuplicateSuspect,
        isManuallyOverridden: false,
        ocrStatus: "done",
      };
      onReceiptAdded(finished);
    } catch (err: unknown) {
      onReceiptAdded({
        ...placeholder,
        ocrStatus: "error",
        uploadError: err instanceof Error ? err.message : "Грешка при обработка",
      });
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(processFile);
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <div className="text-3xl text-muted-foreground">📄</div>
        <p className="text-sm font-medium">
          Повлечете датотеки или{" "}
          <span className="text-primary underline underline-offset-2">изберете</span>
        </p>
        <p className="text-xs text-muted-foreground">PDF, JPG, PNG &middot; до 10 MB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {fileError && (
        <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded">
          {fileError}
        </p>
      )}
    </div>
  );
}
