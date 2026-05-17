"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  applicationStatus: ApplicationStatus;
  approvedAmount: number;
  accountantId: string;
  accountantName: string;
  existingAdvance: ExistingAdvance | null;
}

export default function AdvanceActions({
  applicationId,
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

  // ── State A: no advance yet, application is approved/partially_approved ──
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

      router.push("/accounting");
      router.refresh();
    } catch (err: unknown) {
      setSigning(false);
      setError(err instanceof Error ? err.message : "Настана грешка.");
    }
  }

  // ── State C: payment confirmed — read-only ──
  if (applicationStatus === "paid" && existingAdvance?.status === "paid") {
    return (
      <div className="border border-green-200 rounded-lg bg-green-50 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-green-800">
          Авансот е исплатен
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-green-700">Износ</dt>
            <dd className="font-medium">
              {Number(existingAdvance.amount).toLocaleString("mk-MK")} МКД
            </dd>
          </div>
          <div>
            <dt className="text-xs text-green-700">Референца</dt>
            <dd className="font-medium font-mono">
              {existingAdvance.payment_reference}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-green-700">Датум на исплата</dt>
            <dd className="font-medium">{existingAdvance.payment_date}</dd>
          </div>
          <div>
            <dt className="text-xs text-green-700">Потврдено</dt>
            <dd className="font-medium">
              {existingAdvance.confirmed_at
                ? new Date(existingAdvance.confirmed_at).toLocaleString("mk-MK")
                : "—"}
            </dd>
          </div>
        </dl>
      </div>
    );
  }

  // ── State A: issue the advance ──
  if (!existingAdvance && (applicationStatus === "approved" || applicationStatus === "partially_approved")) {
    return (
      <div className="border border-border rounded-lg bg-card p-5 space-y-4">
        <h2 className="text-base font-semibold">Издавање на аванс</h2>
        <div className="flex items-center justify-between py-3 px-4 bg-muted/40 rounded-md">
          <span className="text-sm text-muted-foreground">
            Износ за исплата
          </span>
          <span className="text-xl font-bold font-mono">
            {approvedAmount.toLocaleString("mk-MK")} МКД
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Кликнете за да издадете налог за аванс. Апликацијата ќе премине во
          статус &#8222;За исплата&#8221;.
        </p>
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </p>
        )}
        <button
          onClick={handleIssueAdvance}
          disabled={loading}
          className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin inline-block" />
              Се издава...
            </>
          ) : (
            "Издади налог за аванс"
          )}
        </button>
      </div>
    );
  }

  // ── State B: confirm payment ──
  if (existingAdvance && applicationStatus === "for_payment") {
    return (
      <div className="border border-border rounded-lg bg-card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Потврда на исплата</h2>
          <span className="text-sm font-mono font-semibold">
            {Number(existingAdvance.amount).toLocaleString("mk-MK")} МКД
          </span>
        </div>

        <p className="text-xs text-muted-foreground">
          Внесете го референтниот број и датумот на реализираната исплата, па
          потпишете за да го финализирате плаќањето (R-07).
        </p>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Референтен број на налогот{" "}
            <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={payRef}
            onChange={(e) => setPayRef(e.target.value)}
            placeholder="пр. PAY-2026-00042"
            className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">
            Датум на исплата <span className="text-destructive">*</span>
          </label>
          <input
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </p>
        )}

        <div className="pt-1 border-t border-border space-y-3">
          <p className="text-xs text-muted-foreground">
            Со кликање, исплатата се потврдува со дигитален потпис (симулација
            на MAdNS PKI — R-07). Потпишува: {accountantName}.
          </p>
          <button
            onClick={handleConfirmPayment}
            disabled={signing || !payRef.trim() || !payDate}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {signing ? (
              <>
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin inline-block" />
                Се потпишува...
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
