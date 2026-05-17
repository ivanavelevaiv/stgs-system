"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getMockIKnowProfile } from "@/lib/iknow-mock";
import StepConferenceDetails, {
  type ConferenceDetails,
} from "./step-conference-details";
import StepBudget, { type BudgetAmounts, calcTotal } from "./step-budget";
import StepDocuments, { type UploadedDoc } from "./step-documents";
import StepReview from "./step-review";

const STEPS = [
  "Конференција",
  "Буџет",
  "Документи",
  "Преглед",
];

const EMPTY_CONFERENCE: ConferenceDetails = {
  conference_name: "",
  conference_location: "",
  conference_url: "",
  paper_title: "",
  travel_start_date: "",
  travel_end_date: "",
  purpose: "",
};

const EMPTY_BUDGET: BudgetAmounts = {
  accommodation: 0,
  transport: 0,
  registration_fee: 0,
  meals: 0,
  other: 0,
};

export default function NewApplicationForm() {
  const router = useRouter();
  const profile = getMockIKnowProfile();

  const [step, setStep] = useState(0);
  const [conference, setConference] = useState<ConferenceDetails>(EMPTY_CONFERENCE);
  const [budget, setBudget] = useState<BudgetAmounts>(EMPTY_BUDGET);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function canAdvance(): boolean {
    if (step === 0) {
      return !!(
        conference.conference_name &&
        conference.conference_location &&
        conference.travel_start_date &&
        conference.travel_end_date &&
        conference.purpose
      );
    }
    if (step === 1) {
      return calcTotal(budget) > 0;
    }
    if (step === 2) {
      return documents.some((d) => d.type === "invitation_letter");
    }
    return true;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Не сте најавени. Обновете ја страницата.");
      setSubmitting(false);
      return;
    }

    // 1. Insert the application
    const appId = crypto.randomUUID();
    const { error: insertErr } = await supabase.from("applications").insert({
      id: appId,
      applicant_id: user.id,
      conference_name: conference.conference_name,
      conference_location: conference.conference_location,
      conference_url: conference.conference_url || null,
      paper_title: conference.paper_title || null,
      travel_start_date: conference.travel_start_date,
      travel_end_date: conference.travel_end_date,
      purpose: conference.purpose,
      requested_amount: calcTotal(budget),
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });

    if (insertErr) {
      setError(`Грешка при поднесување: ${insertErr.message}`);
      setSubmitting(false);
      return;
    }

    // 2. Upload documents and record metadata
    for (const doc of documents) {
      const storagePath = `${user.id}/${appId}/${doc.type}_${doc.file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from("application-documents")
        .upload(storagePath, doc.file, { upsert: false });

      if (uploadErr) {
        // Non-fatal: log but continue — the application is already submitted
        console.error(`Upload failed for ${doc.type}:`, uploadErr.message);
        continue;
      }

      await supabase.from("application_documents").insert({
        application_id: appId,
        document_type: doc.type,
        storage_path: storagePath,
        file_name: doc.file.name,
        file_size_bytes: doc.file.size,
        mime_type: doc.file.type,
        uploaded_by: user.id,
      });
    }

    router.push("/applicant");
    router.refresh();
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Нова апликација за научно патување</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Аплицирате како: {profile.title} {profile.first_name} {profile.last_name}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                  i < step
                    ? "bg-primary border-primary text-primary-foreground"
                    : i === step
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs whitespace-nowrap ${
                  i === step ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mt-[-1rem] mx-1 ${
                  i < step ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="border border-border rounded-lg bg-card p-6 mb-6">
        <h2 className="text-base font-semibold mb-5">{STEPS[step]}</h2>

        {step === 0 && (
          <StepConferenceDetails data={conference} onChange={setConference} />
        )}
        {step === 1 && (
          <StepBudget data={budget} onChange={setBudget} />
        )}
        {step === 2 && (
          <StepDocuments documents={documents} onChange={setDocuments} />
        )}
        {step === 3 && (
          <StepReview
            profile={profile}
            conference={conference}
            budget={budget}
            documents={documents}
          />
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Назад
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Следно
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Поднесување..." : "Поднеси апликација"}
          </button>
        )}
      </div>
    </div>
  );
}
