import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Буџет — STGS" };


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

  const pipeline = { approved: 0, paid: 0, closed: 0 };
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
  const utilizationPct = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
  const isOverBudget = remaining < 0;

  const currentYearBudgets = (budgets ?? []).filter((b) => b.year === currentYear);

  return (
    <div className="p-8 w-full space-y-6">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-blue-950 to-slate-900 p-6 text-white shadow-xl">
        <div
          className="pointer-events-none absolute inset-0 animate-[shimmer_4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"
          aria-hidden="true"
        />
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/[0.04]" />
        <div className="absolute -right-3 top-12 w-24 h-24 rounded-full bg-white/[0.04]" />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300/60 mb-1">
            ФИНКИ — Деканат
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Буџет — {currentYear}</h1>
          <p className="text-sm text-white/50 mt-1">
            Преглед на доделен и искористен буџет по оддел
          </p>
        </div>
      </div>

      {/* ── 3 gradient stat cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Total */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 p-5 text-white shadow-lg shadow-slate-500/20">
          <div
            className="pointer-events-none absolute inset-0 animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
            aria-hidden="true"
          />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-300/70 mb-2">
              Вкупен буџет
            </p>
            <p className="text-3xl font-extrabold leading-tight tabular-nums">
              {fmt(totalBudget)}
            </p>
            <p className="text-sm text-slate-300/50 mt-1">МКД · {currentYear}</p>
          </div>
        </div>

        {/* Allocated */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-5 text-white shadow-lg shadow-amber-500/25">
          <div
            className="pointer-events-none absolute inset-0 animate-[shimmer_3s_ease-in-out_0.8s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
            aria-hidden="true"
          />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-100/70 mb-2">
              Доделено
            </p>
            <p className="text-3xl font-extrabold leading-tight tabular-nums">
              {fmt(totalAllocated)}
            </p>
            <p className="text-sm text-amber-100/60 mt-1">
              МКД ·{" "}
              {totalBudget ? Math.round((totalAllocated / totalBudget) * 100) : 0}% од вкупниот
            </p>
          </div>
        </div>

        {/* Remaining — color flips red when over budget */}
        <div
          className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg bg-gradient-to-br ${
            isOverBudget
              ? "from-red-500 to-rose-600 shadow-red-500/25"
              : "from-emerald-500 to-teal-600 shadow-emerald-500/25"
          }`}
        >
          <div
            className="pointer-events-none absolute inset-0 animate-[shimmer_3s_ease-in-out_1.6s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
            aria-hidden="true"
          />
          <div className="relative z-10">
            <p
              className={`text-xs font-semibold uppercase tracking-widest mb-2 ${
                isOverBudget ? "text-red-100/70" : "text-emerald-100/70"
              }`}
            >
              Преостанато
            </p>
            <p className="text-3xl font-extrabold leading-tight tabular-nums">
              {fmt(Math.abs(remaining))}
            </p>
            <p
              className={`text-sm mt-1 ${
                isOverBudget ? "text-red-100/60" : "text-emerald-100/60"
              }`}
            >
              МКД · {isOverBudget ? "Буџетот е надминат!" : "слободни средства"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Overall utilisation gauge ── */}
      {totalBudget > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                Искористеност на буџетот
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {fmt(totalAllocated)} / {fmt(totalBudget)} МКД
              </p>
            </div>
            <span
              className={`text-4xl font-extrabold tabular-nums ${
                utilizationPct >= 85
                  ? "text-red-600"
                  : utilizationPct >= 60
                  ? "text-amber-600"
                  : "text-blue-600"
              }`}
            >
              {Math.round(utilizationPct)}%
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-all ${
                utilizationPct >= 85
                  ? "from-red-500 to-rose-600"
                  : utilizationPct >= 60
                  ? "from-amber-400 to-orange-500"
                  : "from-blue-500 to-indigo-500"
              }`}
              style={{ width: `${utilizationPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground/60 mt-2">
            <span>0 МКД</span>
            <span>{fmt(totalBudget)} МКД</span>
          </div>
        </div>
      )}

      {/* ── Pipeline summary ── */}
      {currentYearBudgets.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {/* Pipeline mini-tiles — full width now that the department card is removed */}
          <div className="col-span-3 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/20">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Апликации во тек
              </h2>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <PipelineTile
                label="Одобрени"
                value={fmt(pipeline.approved)}
                gradient="from-amber-400 to-yellow-500"
                shadowCls="shadow-amber-400/20"
                delay="0s"
              />
              <PipelineTile
                label="Исплатени"
                value={fmt(pipeline.paid)}
                gradient="from-blue-500 to-indigo-600"
                shadowCls="shadow-blue-500/20"
                delay="1s"
              />
              <PipelineTile
                label="Затворени"
                value={fmt(pipeline.closed)}
                gradient="from-emerald-500 to-green-600"
                shadowCls="shadow-emerald-500/20"
                delay="0.5s"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-2xl bg-card/50 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4 text-2xl select-none">
            💰
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Нема внесен буџет за {currentYear}
          </p>
          <p className="text-xs text-muted-foreground">
            Контактирајте го IT администраторот
          </p>
        </div>
      )}
    </div>
  );
}

function PipelineTile({
  label,
  value,
  gradient,
  shadowCls,
  delay,
}: {
  label: string;
  value: string;
  gradient: string;
  shadowCls: string;
  delay: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} ${shadowCls} shadow-lg p-4 text-white`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        style={{ animation: `shimmer 3.5s ease-in-out ${delay} infinite` }}
        aria-hidden="true"
      />
      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">
          {label}
        </p>
        <p className="text-xl font-extrabold leading-tight tabular-nums">{value}</p>
        <p className="text-xs text-white/50 mt-0.5">МКД</p>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat("mk-MK").format(Math.round(n));
}
