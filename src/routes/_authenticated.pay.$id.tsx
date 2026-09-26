import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Check, Loader2, Upload, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@tanstack/react-router";
import { formatRWF, type LoanStatus } from "@/lib/loan";

export const Route = createFileRoute("/_authenticated/pay/$id")({
  head: () => ({ meta: [{ title: "Pay Trust Fee — WePay" }] }),
  component: PayPage,
});

const BANK_DETAILS = {
  accountName: "WePay Rwanda Ltd",
  accountNumber: "00012-456789-01",
  bank: "Bank of Kigali",
};

function PayPage() {
  const { t } = useI18n();
  const { id } = useParams({ from: "/_authenticated/pay/$id" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showProof, setShowProof] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [txId, setTxId] = useState("");
  const [payDate, setPayDate] = useState("");

  const { data: loan } = useQuery({
    queryKey: ["loan", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("loans")
        .select("*")
        .eq("id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const submitProof = async () => {
    if (!file || !txId.trim() || !payDate) {
      toast.error("Please complete all fields and attach proof.");
      return;
    }
    if (!user || !loan) return;
    setBusy(true);
    try {
      const path = `${user.id}/${loan.id}/proof-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("wepay-documents").upload(path, file);
      if (upErr) throw upErr;

      await supabase.from("payments").insert({
        loan_id: loan.id,
        user_id: user.id,
        payment_type: "trust_fee",
        amount: Number(loan.trust_fee),
        reference: loan.application_ref,
        transaction_id: txId,
        proof_path: path,
        payment_date: payDate,
        status: "paid",
      });
      await supabase.from("loans").update({ status: "verifying_payment" }).eq("id", loan.id).eq("user_id", user.id);
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Payment proof received",
        message: `We are verifying your trust fee payment for ${loan.application_ref}.`,
      });
      qc.invalidateQueries({ queryKey: ["loan", id] });
      toast.success("Proof submitted! We're verifying your payment.");
      navigate({ to: "/applications/$id", params: { id: loan.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  if (!loan) return <Card className="h-48 animate-pulse" />;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/applications/$id" params={{ id }}><ArrowLeft className="mr-2 h-4 w-4" />Back</Link>
      </Button>
      <h1 className="text-2xl font-bold text-foreground">{t("fee.title")}</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">{t("fee.totalDebt")}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{formatRWF(loan.outstanding_balance)}</p>
        </Card>
        <Card className="border-primary/30 bg-accent p-6">
          <p className="text-sm text-accent-foreground">{t("fee.trustFee")}</p>
          <p className="mt-1 text-2xl font-bold text-primary">{formatRWF(loan.trust_fee)}</p>
        </Card>
      </div>

      {!showProof ? (
        <Card className="space-y-4 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("fee.bankDetails")}</h2>
          <CopyRow label={t("fee.accountName")} value={BANK_DETAILS.accountName} copied={copied} onCopy={copy} />
          <CopyRow label={t("fee.accountNumber")} value={BANK_DETAILS.accountNumber} copied={copied} onCopy={copy} />
          <CopyRow label={t("common.bank")} value={BANK_DETAILS.bank} copied={copied} onCopy={copy} />
          <CopyRow label={t("fee.reference")} value={loan.application_ref} copied={copied} onCopy={copy} />
          <Button className="w-full" onClick={() => setShowProof(true)}>{t("fee.paid")}</Button>
        </Card>
      ) : (
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-foreground">{t("fee.proofTitle")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("common.amount")}</Label>
              <Input value={formatRWF(loan.trust_fee)} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>{t("fee.reference")}</Label>
              <Input value={loan.application_ref} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>{t("fee.txId")}</Label>
              <Input value={txId} onChange={(e) => setTxId(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>{t("fee.payDate")}</Label>
              <Input type="date" max={new Date().toISOString().split("T")[0]} value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
            </div>
          </div>
          <label
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-accent/30 p-6 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-accent"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
          >
            {file ? (
              <span className="flex items-center gap-2 text-success"><Check className="h-5 w-5" />{file.name}</span>
            ) : (
              <><Upload className="h-6 w-6 text-primary" />{t("docs.drop")}</>
            )}
            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowProof(false)}>{t("common.back")}</Button>
            <Button className="flex-1" onClick={submitProof} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("fee.uploadProof")}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function CopyRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: string | null;
  onCopy: (label: string, value: string) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-secondary/50 px-4 py-3">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value}</p>
      </div>
      <button onClick={() => onCopy(label, value)} className="text-muted-foreground hover:text-primary">
        {copied === label ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
