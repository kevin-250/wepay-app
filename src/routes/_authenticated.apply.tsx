import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Timeline } from "@/components/Timeline";
import { formatRWF } from "@/lib/loan";

export const Route = createFileRoute("/_authenticated/apply")({
  head: () => ({ meta: [{ title: "Apply for Refinancing — WePay" }] }),
  component: ApplyWizard,
});

const BANKS = ["Bank of Kigali", "Equity Bank", "I&M Bank", "KCB Bank", "Cogebanque", "Ecobank", "Other"];
const DOC_TYPES = [
  { key: "national_id", label: "National ID" },
  { key: "loan_contract", label: "Loan Contract" },
  { key: "collateral_title", label: "Collateral Title" },
  { key: "bank_statement", label: "Bank Statement" },
];

type Form = {
  full_name: string;
  national_id: string;
  phone: string;
  email: string;
  address: string;
  bank: string;
  account_number: string;
  original_amount: string;
  outstanding_balance: string;
  reason: string;
  collateral_type: string;
  collateral_description: string;
  collateral_value: string;
};

function ApplyWizard() {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [files, setFiles] = useState<Record<string, File>>({});

  const [form, setForm] = useState<Form>({
    full_name: profile?.full_name ?? "",
    national_id: profile?.national_id ?? "",
    phone: profile?.phone ?? "",
    email: profile?.email ?? "",
    address: profile?.address ?? "",
    bank: "",
    account_number: "",
    original_amount: "",
    outstanding_balance: "",
    reason: "",
    collateral_type: "",
    collateral_description: "",
    collateral_value: "",
  });

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const steps = [t("wizard.s1"), t("wizard.s2"), t("wizard.s3"), t("wizard.s4"), t("wizard.s5")];

  const validateStep = (): boolean => {
    const req: Record<number, (keyof Form)[]> = {
      0: ["full_name", "national_id", "phone", "email", "address"],
      1: ["bank", "account_number", "original_amount", "outstanding_balance"],
      2: ["collateral_type", "collateral_description", "collateral_value"],
    };
    const fields = req[step] ?? [];
    const e: Record<string, boolean> = {};
    fields.forEach((f) => {
      if (!String(form[f]).trim()) e[f] = true;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, 4));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const saveDraft = () => {
    sessionStorage.setItem("wepay-draft", JSON.stringify(form));
    toast.success("Draft saved for this session.");
  };

  const submit = async () => {
    if (!terms) {
      toast.error("Please accept the terms to continue.");
      return;
    }
    if (!user) return;
    setBusy(true);
    try {
      const { data: loan, error } = await supabase
        .from("loans")
        .insert({
          user_id: user.id,
          full_name: form.full_name,
          national_id: form.national_id,
          phone: form.phone,
          email: form.email,
          address: form.address,
          bank: form.bank,
          account_number: form.account_number,
          original_amount: Number(form.original_amount) || 0,
          outstanding_balance: Number(form.outstanding_balance) || 0,
          reason: form.reason,
          collateral_type: form.collateral_type as any,
          collateral_description: form.collateral_description,
          collateral_value: Number(form.collateral_value) || 0,
          status: "submitted",
        })
        .select()
        .single();
      if (error) throw error;

      // Upload any provided documents
      for (const [docType, file] of Object.entries(files)) {
        const path = `${user.id}/${loan.id}/${docType}-${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("wepay-documents").upload(path, file);
        if (!upErr) {
          await supabase.from("documents").insert({
            loan_id: loan.id,
            user_id: user.id,
            doc_type: docType,
            file_path: path,
            file_name: file.name,
          });
        }
      }

      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Application submitted",
        message: `Your refinancing application ${loan.application_ref} is now under review.`,
      });
      sessionStorage.removeItem("wepay-draft");
      toast.success(t("wizard.submitted"));
      navigate({ to: "/applications/$id", params: { id: loan.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Submission failed");
    } finally {
      setBusy(false);
    }
  };

  const errCls = (k: keyof Form) => (errors[k] ? "border-destructive focus-visible:ring-destructive" : "");

  return (
    <div className="space-y-6">
      <h1 className="text-heading text-foreground">{t("wizard.title")}</h1>

      <Card>
        <Timeline steps={steps.map((label) => ({ label }))} current={step} />
      </Card>

      <Card className="space-y-5">
        {step === 0 && (
          <>
            <Field label={t("auth.fullName")}><Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className={errCls("full_name")} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("auth.nid")}><Input value={form.national_id} onChange={(e) => set("national_id", e.target.value)} className={errCls("national_id")} /></Field>
              <Field label={t("auth.phone")}><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={errCls("phone")} /></Field>
            </div>
            <Field label={t("auth.email")}><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={errCls("email")} /></Field>
            <Field label={t("wizard.address")}><Input value={form.address} onChange={(e) => set("address", e.target.value)} className={errCls("address")} /></Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label={t("common.bank")}>
              <Select value={form.bank} onValueChange={(v) => set("bank", v)}>
                <SelectTrigger className={errCls("bank")}><SelectValue placeholder="Select bank" /></SelectTrigger>
                <SelectContent>{BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label={t("wizard.accountNumber")}><Input value={form.account_number} onChange={(e) => set("account_number", e.target.value)} className={errCls("account_number")} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("wizard.originalAmount")}><Input type="number" value={form.original_amount} onChange={(e) => set("original_amount", e.target.value)} className={errCls("original_amount")} /></Field>
              <Field label={t("wizard.outstanding")}><Input type="number" value={form.outstanding_balance} onChange={(e) => set("outstanding_balance", e.target.value)} className={errCls("outstanding_balance")} /></Field>
            </div>
            <Field label={t("wizard.reason")}><Textarea value={form.reason} onChange={(e) => set("reason", e.target.value)} /></Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label={t("wizard.collType")}>
              <Select value={form.collateral_type} onValueChange={(v) => set("collateral_type", v)}>
                <SelectTrigger className={errCls("collateral_type")}><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="house">{t("coll.house")}</SelectItem>
                  <SelectItem value="land">{t("coll.land")}</SelectItem>
                  <SelectItem value="vehicle">{t("coll.vehicle")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("wizard.collDesc")}><Textarea value={form.collateral_description} onChange={(e) => set("collateral_description", e.target.value)} className={errCls("collateral_description")} /></Field>
            <Field label={t("wizard.collValue")}><Input type="number" value={form.collateral_value} onChange={(e) => set("collateral_value", e.target.value)} className={errCls("collateral_value")} /></Field>
          </>
        )}

        {step === 3 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {DOC_TYPES.map((d) => (
              <FileDrop key={d.key} label={d.label} file={files[d.key]} onPick={(f) => setFiles((p) => ({ ...p, [d.key]: f }))} onClear={() => setFiles((p) => { const n = { ...p }; delete n[d.key]; return n; })} />
            ))}
            <p className="col-span-full text-xs text-muted-foreground">Max 10MB per file. You can also upload documents later.</p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <ReviewRow label={t("auth.fullName")} value={form.full_name} />
            <ReviewRow label={t("common.bank")} value={form.bank} />
            <ReviewRow label={t("wizard.outstanding")} value={formatRWF(Number(form.outstanding_balance))} />
            <ReviewRow label={t("fee.trustFee")} value={formatRWF(Number(form.outstanding_balance) * 0.05)} />
            <ReviewRow label={t("wizard.collType")} value={form.collateral_type} />
            <ReviewRow label={t("wizard.collValue")} value={formatRWF(Number(form.collateral_value))} />
            <ReviewRow label="Documents attached" value={String(Object.keys(files).length)} />
            <label className="flex items-center gap-2 pt-2 text-sm">
              <Checkbox checked={terms} onCheckedChange={(v) => setTerms(!!v)} />
              {t("wizard.terms")}
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <div className="flex gap-2">
            {step > 0 && <Button variant="outline" onClick={back}>{t("common.back")}</Button>}
            <Button variant="ghost" onClick={saveDraft}>{t("common.draft")}</Button>
          </div>
          {step < 4 ? (
            <Button onClick={next}>{t("common.next")}</Button>
          ) : (
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("common.submit")}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

function FileDrop({
  label,
  file,
  onPick,
  onClear,
}: {
  label: string;
  file?: File;
  onPick: (f: File) => void;
  onClear: () => void;
}) {
  const handle = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10MB limit.");
      return;
    }
    onPick(f);
  };
  return (
    <div>
      <Label className="mb-1.5 block">{label}</Label>
      {file ? (
        <div className="flex items-center justify-between rounded-full border border-success/50 bg-success/10 px-4 py-3 text-sm transition-all duration-150">
          <span className="flex items-center gap-2 truncate text-success"><Check className="h-4 w-4 shrink-0" /> <span className="truncate">{file.name}</span></span>
          <button onClick={onClear} className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"><X className="h-4 w-4" /></button>
        </div>
      ) : (
        <label
          className="flex cursor-pointer flex-col items-center gap-2 rounded-full border-2 border-dashed border-border bg-accent/40 px-4 py-6 text-center text-xs text-muted-foreground transition-all duration-150 hover:border-primary hover:bg-accent"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handle(e.dataTransfer.files?.[0]); }}
        >
          <Upload className="h-6 w-6 text-primary" />
          {t_drop()}
          <input type="file" className="hidden" onChange={(e) => handle(e.target.files?.[0])} accept="image/*,.pdf" />
        </label>
      )}
    </div>
  );
}

function t_drop() {
  return "Drag & drop or click";
}
