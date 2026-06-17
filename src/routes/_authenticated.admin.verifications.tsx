import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, XCircle, Download, FileText, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRWF, formatDate, type LoanStatus } from "@/lib/loan";
import type { Loan } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/verifications")({
  head: () => ({ meta: [{ title: "Verifications — WePay" }] }),
  component: Verifications,
});

function Verifications() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, loading, navigate]);

  const { data: loans = [] } = useQuery({
    queryKey: ["verify-payments"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("loans").select("*").eq("status", "verifying_payment").order("updated_at", { ascending: true });
      return (data ?? []) as Loan[];
    },
  });

  const { data: docs = [] } = useQuery({
    queryKey: ["verify-docs"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("*").eq("status", "pending").order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const { data: proofs = {} } = useQuery({
    queryKey: ["verify-proofs", loans.map((l) => l.id)],
    enabled: isAdmin && loans.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*").in("loan_id", loans.map((l) => l.id));
      const map: Record<string, any> = {};
      (data ?? []).forEach((p) => { if (p.proof_path) map[p.loan_id] = p; });
      return map;
    },
  });

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("wepay-documents").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Could not generate link.");
    window.open(data.signedUrl, "_blank");
  };

  const notify = (userId: string, title: string, message: string) =>
    supabase.from("notifications").insert({ user_id: userId, title, message });

  const verifyPayment = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LoanStatus }) => {
      const { error } = await supabase.from("loans").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      const loan = loans.find((l) => l.id === vars.id);
      if (loan) {
        if (vars.status === "in_progress")
          notify(loan.user_id, "Payment verified", `Your trust fee for ${loan.application_ref} was verified. Refinancing is in progress.`);
        else
          notify(loan.user_id, "Payment rejected", `We could not verify your trust fee payment for ${loan.application_ref}. Please re-submit.`);
      }
      qc.invalidateQueries({ queryKey: ["verify-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Payment updated.");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const verifyDoc = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "verified" | "rejected" }) => {
      const { error } = await supabase
        .from("documents")
        .update({ status, rejection_reason: status === "rejected" ? "Document not acceptable" : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      const doc = docs.find((d) => d.id === vars.id);
      if (doc) notify(doc.user_id, `Document ${vars.status}`, `Your document "${doc.file_name ?? doc.doc_type}" was ${vars.status}.`);
      qc.invalidateQueries({ queryKey: ["verify-docs"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Document updated.");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  if (loading || !isAdmin) return null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Admin Console</Link>
      </Button>
      <h1 className="text-2xl font-bold">Verifications</h1>

      {/* Payments */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> Payments awaiting verification ({loans.length})
        </h2>
        {loans.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">No payments awaiting verification.</Card>
        ) : (
          <div className="space-y-2">
            {loans.map((l) => {
              const proof = proofs[l.id];
              return (
                <Card key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-mono text-sm font-semibold">{l.application_ref}</p>
                    <p className="text-xs text-muted-foreground">{l.full_name} · {formatRWF(l.trust_fee)} · {proof ? formatDate(proof.payment_date) : "no proof"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {proof?.proof_path && (
                      <Button variant="outline" size="sm" onClick={() => download(proof.proof_path)}><Download className="mr-1 h-4 w-4" />Proof</Button>
                    )}
                    <Button size="sm" onClick={() => verifyPayment.mutate({ id: l.id, status: "in_progress" })}><CheckCircle2 className="mr-1 h-4 w-4" />Verify</Button>
                    <Button variant="destructive" size="sm" onClick={() => verifyPayment.mutate({ id: l.id, status: "approved" })}><XCircle className="mr-1 h-4 w-4" />Reject</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Documents */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <FileText className="h-4 w-4" /> Documents awaiting verification ({docs.length})
        </h2>
        {docs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">No documents awaiting verification.</Card>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <Card key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{d.file_name ?? d.doc_type}</p>
                    <p className="text-xs capitalize text-muted-foreground">{d.doc_type.replace(/_/g, " ")} · {formatDate(d.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => download(d.file_path)}><Download className="mr-1 h-4 w-4" />View</Button>
                  <Button size="sm" onClick={() => verifyDoc.mutate({ id: d.id, status: "verified" })}><CheckCircle2 className="mr-1 h-4 w-4" />Verify</Button>
                  <Button variant="destructive" size="sm" onClick={() => verifyDoc.mutate({ id: d.id, status: "rejected" })}><XCircle className="mr-1 h-4 w-4" />Reject</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
