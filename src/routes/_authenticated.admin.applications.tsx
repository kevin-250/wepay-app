import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ShieldCheck,
  Download,
  Loader2,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRWF, formatDate, type LoanStatus } from "@/lib/loan";
import { isStuck, type Loan } from "@/lib/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/applications")({
  head: () => ({ meta: [{ title: "Review Applications — WePay" }] }),
  component: AdminApplications,
});

const FILTERS: { key: string; label: string; match: (s: LoanStatus) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "review", label: "To review", match: (s) => s === "submitted" || s === "under_review" },
  { key: "verify", label: "To verify", match: (s) => s === "verifying_payment" },
  { key: "active", label: "Active", match: (s) => s === "in_progress" || s === "fee_paid" },
  { key: "rejected", label: "Rejected", match: (s) => s === "rejected" },
];

function AdminApplications() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Loan | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, loading, navigate]);

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["admin-loans"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("loans").select("*").order("created_at", { ascending: false });
      return (data ?? []) as Loan[];
    },
  });

  if (loading || !isAdmin) return null;

  const active = FILTERS.find((f) => f.key === filter)!;
  const rows = loans.filter((l) => active.match(l.status));

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Admin Console</Link>
      </Button>
      <h1 className="text-2xl font-bold">Review Applications</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const n = loans.filter((l) => f.match(l.status)).length;
          return (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
            >
              {f.label} <span className="ml-1.5 opacity-70">{n}</span>
            </Button>
          );
        })}
      </div>

      {isLoading ? (
        <Card className="h-40 animate-pulse" />
      ) : rows.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">No applications in this view.</Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => setSelected(l)}>
                  <TableCell className="font-mono text-xs">{l.application_ref}</TableCell>
                  <TableCell>{l.full_name ?? "—"}</TableCell>
                  <TableCell>{formatRWF(l.outstanding_balance)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={l.status} />
                      {isStuck(l) && <span className="rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-warning">Stuck</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(l.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Review</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ReviewDialog loan={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ReviewDialog({ loan, onClose }: { loan: Loan | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState("");

  const { data: docs = [] } = useQuery({
    queryKey: ["admin-loan-docs", loan?.user_id],
    enabled: !!loan,
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("*").eq("user_id", loan!.user_id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["admin-loan-payments", loan?.id],
    enabled: !!loan,
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*").eq("loan_id", loan!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-loans"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
    qc.invalidateQueries({ queryKey: ["admin-loan-docs", loan?.user_id] });
  };

  const notify = async (userId: string, title: string, message: string) => {
    await supabase.from("notifications").insert({ user_id: userId, title, message });
  };

  const setStatus = useMutation({
    mutationFn: async ({ status, rejection_reason }: { status: LoanStatus; rejection_reason?: string | null }) => {
      const { error } = await supabase
        .from("loans")
        .update({ status, rejection_reason: rejection_reason ?? null })
        .eq("id", loan!.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      const labels: Record<string, [string, string]> = {
        approved: ["Application approved", `Your application ${loan!.application_ref} was approved. Pay the trust fee to continue.`],
        rejected: ["Application rejected", `Your application ${loan!.application_ref} was rejected. ${reason}`],
        in_progress: ["Payment verified", `Your trust fee for ${loan!.application_ref} was verified. Refinancing is now in progress.`],
        under_review: ["Application reopened", `Your application ${loan!.application_ref} is being re-reviewed.`],
      };
      const msg = labels[vars.status];
      if (msg) notify(loan!.user_id, msg[0], msg[1]);
      invalidate();
      toast.success("Application updated.");
      setReason("");
      onClose();
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const verifyDoc = useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: "verified" | "rejected"; rejection_reason?: string }) => {
      const { error } = await supabase.from("documents").update({ status, rejection_reason: rejection_reason ?? null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-loan-docs", loan?.user_id] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Document updated.");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("wepay-documents").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Could not generate link.");
    window.open(data.signedUrl, "_blank");
  };

  if (!loan) return null;
  const status = loan.status;

  return (
    <Dialog open={!!loan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 font-mono">
            {loan.application_ref}
            <StatusBadge status={status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Field label="Applicant" value={loan.full_name ?? "—"} />
            <Field label="Bank" value={loan.bank ?? "—"} />
            <Field label="Account" value={loan.account_number ?? "—"} />
            <Field label="Outstanding" value={formatRWF(loan.outstanding_balance)} />
            <Field label="Original amount" value={formatRWF(loan.original_amount)} />
            <Field label="Trust fee" value={formatRWF(loan.trust_fee)} />
            <Field label="Collateral" value={`${loan.collateral_type ?? "—"} · ${formatRWF(loan.collateral_value)}`} />
            <Field label="Submitted" value={formatDate(loan.created_at)} />
          </div>
          {loan.reason && <Field label="Reason" value={loan.reason} />}

          {/* Documents */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Documents ({docs.length})</h3>
            {docs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.file_name ?? d.doc_type}</p>
                        <p className="text-xs capitalize text-muted-foreground">{d.status}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => download(d.file_path)}><Download className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-success" onClick={() => verifyDoc.mutate({ id: d.id, status: "verified" })}><CheckCircle2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => verifyDoc.mutate({ id: d.id, status: "rejected", rejection_reason: "Document not acceptable" })}><XCircle className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payments */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payments ({payments.length})</h3>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments submitted.</p>
            ) : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5 text-sm">
                    <div>
                      <p className="font-medium">{formatRWF(p.amount)} · <span className="capitalize">{p.payment_type.replace(/_/g, " ")}</span></p>
                      <p className="text-xs text-muted-foreground">Txn {p.transaction_id ?? "—"} · {formatDate(p.payment_date)}</p>
                    </div>
                    {p.proof_path && (
                      <Button variant="ghost" size="sm" onClick={() => download(p.proof_path!)}><Download className="mr-1 h-4 w-4" />Proof</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reject reason */}
          {(status === "submitted" || status === "under_review") && (
            <Textarea placeholder="Rejection reason (required to reject)" value={reason} onChange={(e) => setReason(e.target.value)} />
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {(status === "submitted" || status === "under_review") && (
              <>
                <Button className="flex-1" onClick={() => setStatus.mutate({ status: "approved" })} disabled={setStatus.isPending}>
                  {setStatus.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Approve
                </Button>
                <Button variant="destructive" className="flex-1" disabled={setStatus.isPending || !reason.trim()} onClick={() => setStatus.mutate({ status: "rejected", rejection_reason: reason })}>
                  <XCircle className="mr-2 h-4 w-4" />Reject
                </Button>
              </>
            )}
            {status === "verifying_payment" && (
              <Button className="flex-1" onClick={() => setStatus.mutate({ status: "in_progress" })} disabled={setStatus.isPending}>
                <ShieldCheck className="mr-2 h-4 w-4" />Verify payment &amp; activate
              </Button>
            )}
            {status !== "submitted" && status !== "completed" && (
              <Button variant="outline" onClick={() => setStatus.mutate({ status: "under_review" })} disabled={setStatus.isPending}>
                <RotateCcw className="mr-2 h-4 w-4" />Reset to review
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  );
}
