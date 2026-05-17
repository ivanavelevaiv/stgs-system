import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Буџет — STGS" };

const DEPT_LABELS: Record<string, string> = {
  "Компјутерски науки": "Компјутерски науки",
  "Информациски системи": "Информациски системи",
  "Компјутерско инженерство": "Компјутерско инженерство",
  "Софтверско инженерство": "Софтверско инженерство",
  "Автоматика": "Автоматика",
  "Електроника": "Електроника",
};

export default async function BudgetPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["deanery", "it_admin"].includes(profile.role ?? "")) {
    redirect("/applicant");
  }

  const currentYear = new Date().getFullYear();

  // Load budgets for current + previous year
  const { data: budgets } = await supabase
    .from("budgets")
    .select("id, year, department, total_amount, allocated_amount")
    .in("year", [currentYear - 1, currentYear])
    .order("year", { ascending: false })
    .order("department");

  // Load pipeline stats: count + sum per status for closed/approved/paid
  const { data: pipelineRows } = await supabase
    .from("applications")
    .select("status, approved_amount")
    .in("status", ["approved", "partially_approved", "for_payment", "paid", "report_submitted", "in_settlement", "closed"]);

  const pipeline = {
    approved: 0,
    paid: 0,
    closed: 0,
  };
  for (const row of pipelineRows ?? []) {
    const amt = Number(row.approved_amount ?? 0);
    if (row.status === "approved" || row.status === "partially_approved") {
      pipeline.approved += amt;
    } else if (row.status === "for_payment" || row.status === "paid") {
      pipeline.paid += amt;
    } else if (["report_submitted", "in_settlement", "closed"].includes(row.status)) {
      pipeline.closed += amt;
    }
  }

  const totalBudget = (budgets ?? [])
    .filter((b) => b.year === currentYear)
    .reduce((s, b) => s + Number(b.total_amount ?? 0), 0);

  const totalAllocated = (budgets ?? [])
    .filter((b) => b.year === currentYear)
    .reduce((s, b) => s + Number(b.allocated_amount ?? 0), 0);

  const remaining = totalBudget - totalAllocated;

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Буџет — {currentYear}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Преглед на доделен и искористен буџет по оддел
        </p>
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          label="Вкупен буџет"
          value={fmt(totalBudget)}
          sub="за тековната година"
          color="text-foreground"
        />
        <SummaryCard
          label="Доделено"
          value={fmt(totalAllocated)}
          sub={`${totalBudget ? Math.round((totalAllocated / totalBudget) * 100) : 0}% од вкупниот`}
          color="text-blue-700"
        />
        <SummaryCard
          label="Преостанато"
          value={fmt(remaining)}
          sub={remaining < 0 ? "Буџетот е надминат!" : "слободни средства"}
          color={remaining < 0 ? "text-destructive" : "text-green-700"}
        />
      </div>

      {/* Budget utilisation bar */}
      {totalBudget > 0 && (
        <div className="border border-border rounded-lg bg-card p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Искористеност на буџетот</span>
            <span className="text-muted-foreground">
              {fmt(totalAllocated)} / {fmt(totalBudget)} МКД
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalAllocated / totalBudget) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Pipeline breakdown */}
      <div className="border border-border rounded-lg bg-card p-5 space-y-3">
        <h2 className="text-base font-semibold">Апликации во тек</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 space-y-0.5">
            <p className="text-xs text-yellow-700 font-medium uppercase tracking-wide">Одобрени</p>
            <p className="text-lg font-bold text-yellow-800">{fmt(pipeline.approved)} МКД</p>
          </div>
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 space-y-0.5">
            <p className="text-xs text-blue-700 font-medium uppercase tracking-wide">Исплатени</p>
            <p className="text-lg font-bold text-blue-800">{fmt(pipeline.paid)} МКД</p>
          </div>
          <div className="rounded-md bg-green-50 border border-green-200 p-3 space-y-0.5">
            <p className="text-xs text-green-700 font-medium uppercase tracking-wide">Затворени</p>
            <p className="text-lg font-bold text-green-800">{fmt(pipeline.closed)} МКД</p>
          </div>
        </div>
      </div>

      {/* Per-department breakdown */}
      {(budgets ?? []).filter((b) => b.year === currentYear).length > 0 && (
        <div className="border border-border rounded-lg bg-card p-5 space-y-4">
          <h2 className="text-base font-semibold">По оддел — {currentYear}</h2>
          <div className="divide-y divide-border">
            {(budgets ?? [])
              .filter((b) => b.year === currentYear)
              .map((b) => {
                const total = Number(b.total_amount ?? 0);
                const alloc = Number(b.allocated_amount ?? 0);
                const pct = total > 0 ? (alloc / total) * 100 : 0;
                return (
                  <div key={b.id} className="py-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {b.department ? (DEPT_LABELS[b.department] ?? b.department) : "—"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {fmt(alloc)} / {fmt(total)} МКД ({Math.round(pct)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {(budgets ?? []).filter((b) => b.year === currentYear).length === 0 && (
        <div className="text-center py-10 border border-dashed border-border rounded-lg text-muted-foreground text-sm">
          Нема внесен буџет за {currentYear}. Контактирајте го IT администраторот.
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="border border-border rounded-lg bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("mk-MK").format(Math.round(n));
}
