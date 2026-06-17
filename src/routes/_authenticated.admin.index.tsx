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
  Eye,
  MousePointerClick,
  Calendar,
  Plus,
  Download,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRWF, type LoanStatus } from "@/lib/loan";
import { isStuck, daysSince, KPI_THRESHOLDS, type Loan } from "@/lib/admin";

// Import new dashboard sub-components
import { RevenueChart } from "@/components/admin/RevenueChart";
import { ActiveDaysChart } from "@/components/admin/ActiveDaysChart";
import { RecentApplicationsTable } from "@/components/admin/RecentApplicationsTable";

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
        supabase.from("payments").select("id, amount, status, payment_type, created_at"),
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
    })
  );

  return (
    <div className="space-y-6 pb-6">
      {/* Top Header Section matching mockup */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Platform analytics, monitoring &amp; verification controls.</p>
        </div>
        
        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Picker Button */}
          <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-semibold rounded-xl border-border bg-card">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Jan 1, 2025 - Feb 1, 2025</span>
          </Button>

          {/* Range Selector */}
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold rounded-xl border-border bg-card">
            <span>Last 30 days</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>

          {/* Add Widget Button */}
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold rounded-xl border-border bg-card">
            <Plus className="h-3.5 w-3.5 text-primary" />
            <span>Add widget</span>
          </Button>

          {/* Export Action */}
          <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="h-3.5 w-3.5" />
            <span>Export</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards Row (4 Top Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Applications"
          value={isLoading ? "—" : total}
          trend="+15.5%"
          trendPositive={true}
          subtext="vs 14,553 last period"
          icon={Eye}
        />
        <KpiCard
          title="Awaiting Review"
          value={isLoading ? "—" : pendingReview}
          trend="+8.4%"
          trendPositive={true}
          subtext="vs 5,732 last period"
          icon={Clock}
          accent={pendingReview > 0}
        />
        <KpiCard
          title="Payments to Verify"
          value={isLoading ? "—" : pendingPayments}
          trend="-10.5%"
          trendPositive={false}
          subtext="vs 3,294 last period"
          icon={MousePointerClick}
          accent={pendingPayments > 0}
        />
        <KpiCard
          title="Documents to Verify"
          value={isLoading ? "—" : pendingDocs}
          trend="+4.4%"
          trendPositive={true}
          subtext="vs 1,188 last period"
          icon={FileCheck2}
          accent={pendingDocs > 0}
        />
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Side: Revenue Chart */}
        <div className="lg:col-span-2">
          <RevenueChart payments={payments} loans={loans} isLoading={isLoading} />
        </div>

        {/* Right Side: Active Days Chart */}
        <div>
          <ActiveDaysChart loans={loans} isLoading={isLoading} />
        </div>
      </div>

      {/* Recent Applications Table (Full Width) */}
      <div>
        <RecentApplicationsTable loans={loans} isLoading={isLoading} />
      </div>

      {/* System Monitoring Alerts Section */}
      <div className="pt-4 border-t border-border">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <AlertTriangle className="h-4 w-4" /> KPI Threshold Alerts
        </h2>
        {isLoading ? (
          <Card className="h-16 animate-pulse border border-border" />
        ) : alerts.length === 0 ? (
          <Card className="flex items-center gap-2.5 p-4 text-xs text-muted-foreground border border-border bg-card">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> All core KPIs are currently within stable operating thresholds.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {alerts.map((a, i) => (
              <Card
                key={i}
                className={`flex items-start gap-3 border-l-4 p-4 border border-border bg-card ${
                  a.tone === "destructive" ? "border-l-destructive" : "border-l-warning"
                }`}
              >
                <AlertTriangle
                  className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${a.tone === "destructive" ? "text-destructive" : "text-warning"}`}
                />
                <div>
                  <p className="text-xs font-bold text-foreground">{a.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{a.detail}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Admin Action Quick Links Section */}
      <div className="grid gap-4 sm:grid-cols-3 pt-2">
        <AdminLink
          to="/admin/applications"
          icon={FileCheck2}
          label="Review Applications"
          desc="Approve, reject or request updates"
        />
        <AdminLink
          to="/admin/verifications"
          icon={ShieldCheck}
          label="Verifications Portal"
          desc="Confirm trust fees &amp; documents"
        />
        <AdminLink
          to="/users"
          icon={Users}
          label="Role Management"
          desc="Manage system admin roles"
        />
      </div>
    </div>
  );
}

// KPI Top Card Component helper
function KpiCard({
  title,
  value,
  trend,
  trendPositive,
  subtext,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  trend: string;
  trendPositive: boolean;
  subtext: string;
  icon: any;
  accent?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4 shadow-sm border border-border bg-card transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground tracking-wide">{title}</span>
        <div className={`flex h-7.5 w-7.5 items-center justify-center rounded-lg bg-primary/10 text-primary ${accent ? "text-warning bg-warning/15" : ""}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-extrabold tracking-tight text-foreground">{value}</span>
        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            trendPositive
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-destructive/10 text-destructive"
          }`}
        >
          {trend}
        </span>
      </div>

      <span className="text-[10px] text-muted-foreground">{subtext}</span>
    </Card>
  );
}

// Admin navigation link card helper
function AdminLink({ to, icon: Icon, label, desc }: { to: string; icon: any; label: string; desc: string }) {
  return (
    <Button asChild variant="outline" className="h-auto justify-start p-4 bg-card hover:bg-muted/40 border-border rounded-xl">
      <Link to={to}>
        <Icon className="mr-3 h-5 w-5 text-primary shrink-0" />
        <span className="text-left">
          <span className="block text-xs font-bold text-foreground">{label}</span>
          <span className="block text-[10px] text-muted-foreground mt-0.5">{desc}</span>
        </span>
      </Link>
    </Button>
  );
}

