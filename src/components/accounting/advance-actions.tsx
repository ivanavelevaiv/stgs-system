"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications";
import type { Database } from "@/types/database.types";

type ApplicationStatus = Database["public"]["Enums"]["application_status"];
type AdvanceStatus = Database["public"]["Enums"]["advance_status"];

interface ExistingAdvance {
  id: string;
  amount: number;
  status: AdvanceStatus;
  payment_reference: string | null;
  payment_date: string | null;
  issued_at: string | null;
  confirmed_at: string | null;
}

interface Props {
  applicationId: string;
  applicantId: string;
  applicationStatus: ApplicationStatus;
  approvedAmount: number;
  accountantId: string;
  accountantName: string;
  existingAdvance: ExistingAdvance | null;
}

export default function AdvanceActions({
  applicationId,
  applicantId,
  applicationStatus,
  approvedAmount,
  accountantId,
  accountantName,
  existingAdvance,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [payRef, setPayRef] = useState("");
  const [payDate, setPayDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── State A: no advance yet ──
  async function handleIssueAdvance() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      const { error: advErr } = await supabase.from("advances").insert({
        application_id: applicationId,
        amount: approvedAmount,
        status: "issued",
        issued_by: accountantId,
        issued_at: new Date().toISOString(),
      });
      if (advErr) throw advErr;

      const { error: appErr } = await supabase
        .from("applications")
        .update({ status: "for_payment" })
        .eq("id", applicationId);
      if (appErr) throw appErr;

      await createNotification({
        recipientId: applicantId,
        applicationId,
        type: "payment_confirmed",
        title: "Авансот е издаден",
        body: `Налогот за аванс од ${approvedAmount.toLocaleString("mk-MK")} МКД е издаден и се наоѓа на исплата.`,
      });

      router.push("/accounting");
      router.refresh();
    } catch (err: unknown) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Настана грешка.");
    }
  }

  // ── State B: advance issued, waiting for payment confirmation ──
  async function handleConfirmPayment() {
    if (!payRef.trim() || !payDate) {
      setError("Внесете референтен број и датум на исплата.");
      return;
    }
    if (!existingAdvance) return;

    setError(null);
    setSigning(true);

    try {
      const supabase = createClient();

      const { error: advErr } = await supabase
        .from("advances")
        .update({
          status: "paid",
          payment_reference: payRef.trim(),
          payment_date: payDate,
          confirmed_by: accountantId,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", existingAdvance.id);
      if (advErr) throw advErr;

      const { error: appErr } = await supabase
        .from("applications")
        .update({ status: "paid" })
        .eq("id", applicationId);
      if (appErr) throw appErr;

      await createNotification({
        recipientId: applicantId,
        applicationId,
        type: "payment_confirmed",
        title: "Авансот е исплатен",
        body: `Авансот е исплатен (реф. ${payRef.trim()}). Можете да поднесете извештај по враќањето.`,
      });

      router.push("/accounting");
      router.refresh();
    } catch (err: unknown) {
      setSigning(false);
      setError(err instanceof Error ? err.message : "Настана грешка.");
    }
  }

  // ── State C: advance already paid — read-only success card ──
  // Keyed on advance.status, not application.status, so it shows even if the
  // application status update succeeded but the page is reloaded mid-flow.
  if (existingAdvance?.status === "paid") {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-6 text-white shadow-lg shadow-emerald-500/25">
        <div
          className="pointer-events-none absolute inset-0 animate-[shimmer_3.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
          aria-hidden="true"
        />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-100/70 mb-3">
            Авансот е исплатен
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-emerald-100/60 mb-0.5">Износ</dt>
              <dd className="font-bold tabular-nums">
                {Number(existingAdvance.amount).toLocaleString("mk-MK")} МКД
              </dd>
            </div>
            <div>
              <dt className="text-xs text-emerald-100/60 mb-0.5">Референца</dt>
              <dd className="font-bold font-mono">{existingAdvance.payment_reference}</dd>
            </div>
            <div>
              <dt className="text-xs text-emerald-100/60 mb-0.5">Датум на исплата</dt>
              <dd className="font-semibold">{existingAdvance.payment_date}</dd>
            </div>
            <div>
              <dt className="text-xs text-emerald-100/60 mb-0.5">Потврдено</dt>
              <dd className="font-semibold">
                {existingAdvance.confirmed_at
                  ? new Date(existingAdvance.confirmed_at).toLocaleString("mk-MK")
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    );
  }

  // ── State A: issue the advance ──
  // Also covers `for_payment` without an advance record (partial-failure recovery).
  if (
    !existingAdvance &&
    (applicationStatus === "approved" ||
      applicationStatus === "partially_approved" ||
      applicationStatus === "for_payment")
  ) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <h2 className="text-base font-bold">Издавање на аванс</h2>

        {/* Amount display — gradient mini card */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 text-white shadow-md shadow-blue-500/20">
          <div
            className="pointer-events-none absolute inset-0 animate-[shimmer_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"
            aria-hidden="true"
          />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-100/70 mb-2">
              Износ за исплата
            </p>
            <p className="text-4xl font-extrabold tabular-nums leading-tight">
              {approvedAmount.toLocaleString("mk-MK")}
            </p>
            <p className="text-base text-blue-100/60 mt-1">МКД</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Кликнете за да издадете налог за аванс. Апликацијата ќе премине во
          статус &#8222;За исплата&#8221;.
        </p>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <button
          onClick={handleIssueAdvance}
          disabled={loading}
          className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Се издава…
            </>
          ) : (
            "Издади налог за аванс"
          )}
        </button>
      </div>
    );
  }

  // ── State B: advance issued, confirm payment ──
  // Keyed on existingAdvance being non-null (State C already handled the paid case).
  // This covers: for_payment + advance, AND approved + advance (partial-failure
  // where the advance INSERT succeeded but the application status update did not).
  if (existingAdvance) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Потврда на исплата</h2>
          <span className="text-base font-extrabold font-mono tabular-nums text-primary">
            {Number(existingAdvance.amount).toLocaleString("mk-MK")} МКД
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Внесете го референтниот број и датумот на реализираната исплата, па
          потпишете за да го финализирате плаќањето (R-07).
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">
              Референтен број на налогот{" "}
              <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
              placeholder="пр. PAY-2026-00042"
              className="w-full px-3 py-2.5 border border-input rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">
              Датум на исплата <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-input rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            />
          </div>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="pt-1 border-t border-border space-y-3">
          <p className="text-xs text-muted-foreground">
            Со кликање, исплатата се потврдува со дигитален потпис (симулација
            на MAdNS PKI — R-07). Потпишува: {accountantName}.
          </p>
          <button
            onClick={handleConfirmPayment}
            disabled={signing || !payRef.trim() || !payDate}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
          >
            {signing ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Се потпишува…
              </>
            ) : (
              "Потврди исплата и потпиши"
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
