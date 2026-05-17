"use client";

import type { DocumentType } from "@/types/database.types";

export interface UploadedDoc {
  type: DocumentType;
  file: File;
}

interface DocSpec {
  type: DocumentType;
  label: string;
  required: boolean;
  hint: string;
}

const DOCUMENT_SPECS: DocSpec[] = [
  {
    type: "invitation_letter",
    label: "Покана / Писмо за прифаќање",
    required: true,
    hint: "Задолжително — PDF или DOCX",
  },
  {
    type: "paper_abstract",
    label: "Апстракт на труд",
    required: false,
    hint: "PDF или DOCX",
  },
  {
    type: "conference_program",
    label: "Програма на конференцијата",
    required: false,
    hint: "PDF",
  },
  {
    type: "travel_plan",
    label: "План на патување",
    required: false,
    hint: "PDF или DOCX",
  },
];

const ACCEPTED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface Props {
  documents: UploadedDoc[];
  onChange: (docs: UploadedDoc[]) => void;
}

export default function StepDocuments({ documents, onChange }: Props) {
  function handleFile(type: DocumentType, file: File | null) {
    if (!file) {
      onChange(documents.filter((d) => d.type !== type));
      return;
    }
    const existing = documents.filter((d) => d.type !== type);
    onChange([...existing, { type, file }]);
  }

  function getDoc(type: DocumentType): UploadedDoc | undefined {
    return documents.find((d) => d.type === type);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Прикачете ги потребните документи. Се прифаќаат само PDF и Word (.docx)
        датотеки, максимум 10 MB по датотека.
      </p>

      {DOCUMENT_SPECS.map((spec) => {
        const uploaded = getDoc(spec.type);
        return (
          <div
            key={spec.type}
            className="flex items-start gap-4 p-4 border border-border rounded-lg bg-card"
          >
            <div className="mt-0.5">
              {uploaded ? (
                <CheckIcon className="w-5 h-5 text-green-600" />
              ) : spec.required ? (
                <RequiredIcon className="w-5 h-5 text-destructive" />
              ) : (
                <OptionalIcon className="w-5 h-5 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{spec.label}</p>
                {spec.required && (
                  <span className="text-xs text-destructive font-medium">
                    *задолжително
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{spec.hint}</p>

              {uploaded && (
                <p className="text-xs text-green-700 mt-1 truncate">
                  ✓ {uploaded.file.name} (
                  {(uploaded.file.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>

            <label className="shrink-0 cursor-pointer">
              <span className="px-3 py-1.5 border border-input rounded-md text-xs font-medium hover:bg-accent transition-colors">
                {uploaded ? "Замени" : "Прикачи"}
              </span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file && !ACCEPTED_MIME.includes(file.type)) {
                    alert("Се прифаќаат само PDF и Word (.docx) датотеки.");
                    e.target.value = "";
                    return;
                  }
                  if (file && file.size > 10 * 1024 * 1024) {
                    alert("Максималната големина е 10 MB.");
                    e.target.value = "";
                    return;
                  }
                  handleFile(spec.type, file);
                }}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function RequiredIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function OptionalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
        clipRule="evenodd"
      />
    </svg>
  );
}
