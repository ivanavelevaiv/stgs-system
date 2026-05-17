"use client";

export interface ConferenceDetails {
  conference_name: string;
  conference_location: string;
  conference_url: string;
  paper_title: string;
  travel_start_date: string;
  travel_end_date: string;
  purpose: string;
}

interface Props {
  data: ConferenceDetails;
  onChange: (data: ConferenceDetails) => void;
}

export default function StepConferenceDetails({ data, onChange }: Props) {
  function set<K extends keyof ConferenceDetails>(key: K, value: string) {
    onChange({ ...data, [key]: value });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Назив на конференција *" required>
          <input
            type="text"
            required
            value={data.conference_name}
            onChange={(e) => set("conference_name", e.target.value)}
            placeholder="нпр. IEEE EUROCON 2026"
            className={inputCls}
          />
        </Field>

        <Field label="Локација (град, држава) *" required>
          <input
            type="text"
            required
            value={data.conference_location}
            onChange={(e) => set("conference_location", e.target.value)}
            placeholder="нпр. Белград, Србија"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Веб-страница на конференцијата">
        <input
          type="url"
          value={data.conference_url}
          onChange={(e) => set("conference_url", e.target.value)}
          placeholder="https://..."
          className={inputCls}
        />
      </Field>

      <Field label="Наслов на трудот">
        <input
          type="text"
          value={data.paper_title}
          onChange={(e) => set("paper_title", e.target.value)}
          placeholder="Наслов на прифатениот труд"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Датум на поаѓање *" required>
          <input
            type="date"
            required
            value={data.travel_start_date}
            onChange={(e) => set("travel_start_date", e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Датум на враќање *" required>
          <input
            type="date"
            required
            min={data.travel_start_date || undefined}
            value={data.travel_end_date}
            onChange={(e) => set("travel_end_date", e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Цел и научна вредност на патувањето *" required>
        <textarea
          required
          rows={4}
          value={data.purpose}
          onChange={(e) => set("purpose", e.target.value)}
          placeholder="Опишете ја научната вредност и целта на учеството..."
          className={`${inputCls} resize-none`}
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring";
