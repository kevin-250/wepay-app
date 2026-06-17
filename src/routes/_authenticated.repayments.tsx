import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRWF, formatDate } from "@/lib/loan";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/repayments")({
  head: () => ({ meta: [{ title: "Repayments — WePay" }] }),
  component: Repayments,
});

function Repayments() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: loan } = useQuery({
    queryKey: ["active-loan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("loans")
        .select("*")
        .in("status", ["in_progress", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["installments", loan?.id],
    enabled: !!loan,
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("loan_id", loan!.id)
        .eq("payment_type", "installment")
        .order("due_date", { ascending: true });
      return data ?? [];
    },
  });

  if (!loan) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("repay.title")}</h1>
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No active refinancing yet. Repayments appear once your refinancing is active.
        </Card>
      </div>
    );
  }

  const total = Number(loan.outstanding_balance);
  const repaid = Number(loan.amount_repaid);
  const outstanding = Math.max(total - repaid, 0);
  const pct = total > 0 ? Math.min(Math.round((repaid / total) * 100), 100) : 0;
  const monthly = Math.round(total / 12);

  const makePayment = async () => {
    setBusy(true);
    try {
      const amount = Math.min(monthly, outstanding);
      await supabase.from("payments").insert({
        loan_id: loan.id,
        user_id: user!.id,
        payment_type: "installment",
        amount,
        reference: loan.application_ref,
        payment_date: new Date().toISOString().split("T")[0],
        status: "paid",
      });
      const newRepaid = repaid + amount;
      await supabase
        .from("loans")
        .update({ amount_repaid: newRepaid, status: newRepaid >= total ? "completed" : "in_progress" })
        .eq("id", loan.id);
      qc.invalidateQueries({ queryKey: ["active-loan", user?.id] });
      qc.invalidateQueries({ queryKey: ["installments", loan.id] });
      toast.success("Payment recorded.");
    } catch (err: any) {
      toast.error(err.message ?? "Payment failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("repay.title")}</h1>

      {outstanding === 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-4 text-success">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-sm font-medium">{t("repay.done")}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-3 p-6">
          <ProgressCircle pct={pct} />
          <p className="text-sm text-muted-foreground">{t("repay.repaid")}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">{t("repay.outstanding")}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatRWF(outstanding)}</p>
          <p className="mt-2 text-xs text-muted-foreground">of {formatRWF(total)} total</p>
        </Card>
        <Card className="flex flex-col p-6">
          <p className="text-sm text-muted-foreground">{t("repay.nextDue")}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatRWF(Math.min(monthly, outstanding))}</p>
          {outstanding > 0 && (
            <Button className="mt-auto" disabled={busy} onClick={makePayment}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("repay.makePayment")}
            </Button>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">{t("repay.installments")}</h2>
        </div>
        {payments.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("common.amount")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.payment_date)}</TableCell>
                  <TableCell>{formatRWF(p.amount)}</TableCell>
                  <TableCell><span className="font-medium capitalize text-success">{t("docs.verified") === "Verified" ? "Paid" : "Paid"}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function ProgressCircle({ pct }: { pct: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-border)" strokeWidth="10" />
      <circle
        cx="60" cy="60" r={r} fill="none" stroke="var(--color-primary)" strokeWidth="10"
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-700"
      />
      <text x="60" y="60" textAnchor="middle" dominantBaseline="central" className="rotate-90 fill-foreground text-xl font-bold" transform="rotate(90 60 60)">
        {pct}%
      </text>
    </svg>
  );
}
