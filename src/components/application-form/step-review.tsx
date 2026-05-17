"use client";

import type { ConferenceDetails } from "./step-conference-details";
import type { BudgetAmounts } from "./step-budget";
import type { UploadedDoc } from "./step-documents";
import { calcTotal } from "./step-budget";
import type { IKnowProfile } from "@/lib/iknow-mock";

interface Props {
  profile: IKnowProfile;
  conference: ConferenceDetails;
  budget: BudgetAmounts;
  documents: UploadedDoc[];
}

const BUDGET_LABELS: Record<keyof BudgetAmounts, string> = {
  accommodation: "Сместување",
  transport: "Транспорт",
  registration_fee: "Котизација",
  meals: "Исхрана",
  other: "Останато",
};

const DOC_LABELS: Record<string, string> = {
  invitation_letter: "Покана / Писмо за прифаќање",
  paper_abstract: "Апстракт на труд",
  conference_program: "Програма на конференцијата",
  travel_plan: "План на патување",
};

export default function StepReview({ profile, conference, budget, documents }: Props) {
  const total = calcTotal(budget);

  return (
    <div className="space-y-6">
      <Section title="Апликант">
        <Row label="Ime" value={`${profile.first_name} ${profile.last_name}`} />
        <Row label="Е-пошта" value={profile.email} />
        <Row label="Звање" value={profile.title} />
        <Row label="Катедра" value={profile.department} />
      </Section>

      <Section title="Конференција">
        <Row label="Назив" value={conference.conference_name} />
        <Row label="Локација" value={conference.conference_location} />
        {conference.conference_url && (
          <Row label="Веб" value={conference.conference_url} />
        )}
        {conference.paper_title && (
          <Row label="Труд" value={conference.paper_title} />
        )}
        <Row
          label="Датуми"
          value={`${conference.travel_start_date} – ${conference.travel_end_date}`}
        />
        <Row label="Цел" value={conference.purpose} />
      </Section>

      <Section title="Буџет (МКД)">
        {(Object.entries(budget) as [keyof BudgetAmounts, number][])
          .filter(([, v]) => v > 0)
          .map(([key, val]) => (
            <Row
              key={key}
              label={BUDGET_LABELS[key]}
              value={`${new Intl.NumberFormat("mk-MK").format(val)} МКД`}
            />
          ))}
        <div className="pt-2 border-t border-border">
          <Row
            label="Вкупно"
            value={`${new Intl.NumberFormat("mk-MK").format(total)} МКД`}
            bold
          />
        </div>
      </Section>

      <Section title="Документи">
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нема прикачени документи.</p>
        ) : (
          documents.map((doc) => (
            <Row
              key={doc.type}
              label={DOC_LABELS[doc.type] ?? doc.type}
              value={doc.file.name}
            />
          ))
        )}
      </Section>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        По поднесувањето, апликацијата ќе биде проследена до Научниот совет за
        преглед. Ќе добиете известување по е-пошта за секоја промена на статусот.
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </h3>
      <div className="border border-border rounded-lg divide-y divide-border bg-card">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex gap-4 px-4 py-2.5 text-sm">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
