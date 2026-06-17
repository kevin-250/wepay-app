import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileCheck2,
  ShieldCheck,
  Users,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRWF, type LoanStatus } from "@/lib/loan";
import { isStuck, daysSince, KPI_THRESHOLDS, type Loan } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin Console — WePay" }] }),
  component: AdminConsole,
});

function AdminConsole() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    enabled: isAdmin,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [loansRes, paymentsRes, docsRes] = await Promise.all([
        supabase.from("loans").select("*").order("created_at", { ascending: false }),
        supabase.from("payments").select("id, amount, status, payment_type"),
        supabase.from("documents").select("id, status"),
      ]);
      return {
        loans: (loansRes.data ?? []) as Loan[],
        payments: paymentsRes.data ?? [],
        docs: docsRes.data ?? [],
      };
    },
  });

  if (loading || !isAdmin) return null;

  const loans = data?.loans ?? [];
  const payments = data?.payments ?? [];
  const docs = data?.docs ?? [];

  const count = (s: LoanStatus) => loans.filter((l) => l.status === s).length;
  const total = loans.length;
  const approved = count("approved") + count("fee_paid") + count("in_progress") + count("completed");
  const rejected = count("rejected");
  const pendingReview = count("submitted") + count("under_review");
  const pendingPayments = loans.filter((l) => l.status === "verifying_payment").length;
  const pendingDocs = docs.filter((d) => d.status === "pending").length;
  const feesCollected = payments
    .filter((p) => p.payment_type === "trust_fee" && p.status === "paid")
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const rejectionRate = total ? Math.round((rejected / total) * 100) : 0;
  const stuck = loans.filter(isStuck);

  // Build monitoring alerts
  const alerts: { tone: "destructive" | "warning"; title: string; detail: string }[] = [];
  if (rejectionRate > KPI_THRESHOLDS.rejectionRatePct)
    alerts.push({
      tone: "destructive",
      title: `High rejection rate: ${rejectionRate}%`,
      detail: `Above the ${KPI_THRESHOLDS.rejectionRatePct}% threshold. Review approval criteria.`,
    });
  if (pendingReview > KPI_THRESHOLDS.pendingReview)
    alerts.push({
      tone: "warning",
      title: `${pendingReview} applications awaiting review`,
      detail: `Above the ${KPI_THRESHOLDS.pendingReview} threshold. Clear the review queue.`,
    });
  if (pendingPayments + pendingDocs > KPI_THRESHOLDS.pendingVerifications)
    alerts.push({
      tone: "warning",
      title: `${pendingPayments + pendingDocs} items awaiting verification`,
      detail: `${pendingPayments} payments and ${pendingDocs} documents need verifying.`,
    });
  stuck.forEach((l) =>
    alerts.push({
      tone: "warning",
      title: `${l.application_ref} stuck in "${l.status.replace(/_/g, " ")}"`,
      detail: `No movement for ${daysSince(l.updated_at ?? l.created_at)} days.`,
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Console</h1>
          <p className="text-sm text-muted-foreground">Platform analytics &amp; monitoring.</p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={TrendingUp} label="Total applications" value={total} loading={isLoading} />
        <Kpi icon={Clock} label="Awaiting review" value={pendingReview} loading={isLoading} accent={pendingReview > 0} />
        <Kpi icon={CheckCircle2} label="Approved" value={approved} loading={isLoading} />
        <Kpi icon={XCircle} label="Rejected" value={rejected} loading={isLoading} />
        <Kpi icon={Wallet} label="Trust fees collected" value={formatRWF(feesCollected)} loading={isLoading} />
        <Kpi icon={ShieldCheck} label="Payments to verify" value={pendingPayments} loading={isLoading} accent={pendingPayments > 0} />
        <Kpi icon={FileCheck2} label="Documents to verify" value={pendingDocs} loading={isLoading} accent={pendingDocs > 0} />
        <Kpi icon={TrendingUp} label="Rejection rate" value={`${rejectionRate}%`} loading={isLoading} accent={rejectionRate > KPI_THRESHOLDS.rejectionRatePct} />
      </div>

      {/* Monitoring alerts */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <AlertTriangle className="h-4 w-4" /> Monitoring alerts
        </h2>
        {isLoading ? (
          <Card className="h-20 animate-pulse" />
        ) : alerts.length === 0 ? (
          <Card className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" /> All KPIs within thresholds. No stuck applications.
          </Card>
        ) : (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <Card
                key={i}
                className={`flex items-start gap-3 border-l-4 p-4 ${
                  a.tone === "destructive"
                    ? "border-l-destructive bg-destructive/5"
                    : "border-l-warning bg-warning/5"
                }`}
              >
                <AlertTriangle
                  className={`mt-0.5 h-5 w-5 shrink-0 ${a.tone === "destructive" ? "text-destructive" : "text-warning"}`}
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">{a.title}</p>
                  <p className="text-sm text-muted-foreground">{a.detail}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminLink to="/admin/applications" icon={FileCheck2} label="Review applications" desc="Approve, reject &amp; verify" />
        <AdminLink to="/admin/verifications" icon={ShieldCheck} label="Verifications" desc="Payments &amp; documents" />
        <AdminLink to="/users" icon={Users} label="Role management" desc="Promote &amp; reset users" />
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: any;
  label: string;
  value: string | number;
  loading?: boolean;
  accent?: boolean;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-warning" : "text-primary"}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${accent ? "text-warning" : "text-foreground"}`}>
        {loading ? "—" : value}
      </p>
    </Card>
  );
}

function AdminLink({ to, icon: Icon, label, desc }: { to: string; icon: any; label: string; desc: string }) {
  return (
    <Button asChild variant="outline" className="h-auto justify-start p-4">
      <Link to={to}>
        <Icon className="mr-3 h-5 w-5 text-primary" />
        <span className="text-left">
          <span className="block text-sm font-semibold text-foreground">{label}</span>
          <span className="block text-xs text-muted-foreground">{desc}</span>
        </span>
      </Link>
    </Button>
  );
}
