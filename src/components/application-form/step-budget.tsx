"use client";

export interface BudgetAmounts {
  accommodation: number;
  transport: number;
  registration_fee: number;
  meals: number;
  other: number;
}

interface Props {
  data: BudgetAmounts;
  onChange: (data: BudgetAmounts) => void;
}

const CATEGORIES: { key: keyof BudgetAmounts; label: string }[] = [
  { key: "accommodation", label: "Сместување" },
  { key: "transport", label: "Транспорт" },
  { key: "registration_fee", label: "Котизација" },
  { key: "meals", label: "Исхрана" },
  { key: "other", label: "Останато" },
];

export function calcTotal(amounts: BudgetAmounts): number {
  return Object.values(amounts).reduce((sum, v) => sum + (v || 0), 0);
}

export default function StepBudget({ data, onChange }: Props) {
  function set(key: keyof BudgetAmounts, raw: string) {
    const value = parseFloat(raw) || 0;
    onChange({ ...data, [key]: value });
  }

  const total = calcTotal(data);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Внесете проценети износи по категории (во МКД). Вкупниот износ ќе биде
        бараниот грант.
      </p>

      <div className="space-y-3">
        {CATEGORIES.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-4">
            <label className="w-40 text-sm font-medium shrink-0">{label}</label>
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                step="1"
                value={data[key] || ""}
                onChange={(e) => set(key, e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 pr-14 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring text-right"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                МКД
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border flex justify-between items-center">
        <span className="text-sm font-semibold">Вкупно барање</span>
        <span className="text-lg font-bold">
          {new Intl.NumberFormat("mk-MK").format(total)}{" "}
          <span className="text-sm font-normal text-muted-foreground">МКД</span>
        </span>
      </div>

      {total === 0 && (
        <p className="text-sm text-destructive">
          Внесете барем еден износ за да продолжите.
        </p>
      )}
    </div>
  );
}
