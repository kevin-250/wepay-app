import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2, FolderOpen, CreditCard, ListChecks, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { TIMELINE_STEPS, statusToStep, formatRWF, type LoanStatus } from "@/lib/loan";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — WePay" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const { profile, user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAdmin) navigate({ to: "/admin", replace: true });
  }, [isAdmin, loading, navigate]);

  const { data: loan, isLoading } = useQuery({
    queryKey: ["latest-loan", user?.id],
    enabled: !!user && !isAdmin,
    queryFn: async () => {
      const { data } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const name = profile?.full_name?.split(" ")[0] ?? "there";

  if (loading || isAdmin) {
    return <Card className="h-48 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading text-foreground">
          {t("dash.welcome")}, {name} 👋
        </h1>
        <p className="text-body">Here's an overview of your refinancing journey.</p>
      </div>

      {isLoading ? (
        <Card className="h-48 animate-pulse" />
      ) : !loan ? (
        <Card className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <FilePlus2 className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-heading text-foreground">{t("dash.noApp")}</h2>
            <p className="mx-auto mt-1 max-w-md text-body">{t("dash.noAppDesc")}</p>
          </div>
          <Button asChild size="lg">
            <Link to="/apply">
              {t("dash.startNew")} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-label uppercase tracking-wide">{t("dash.appId")}</p>
              <p className="font-mono text-hero text-foreground tabular-nums">{loan.application_ref}</p>
              <p className="mt-1 text-body">
                {loan.bank} · <span className="tabular-nums">{formatRWF(loan.outstanding_balance)}</span>
              </p>
            </div>
            <StatusBadge status={loan.status as LoanStatus} />
          </div>
          <div className="mt-8">
            <Timeline
              steps={TIMELINE_STEPS.map((k) => ({ label: t(k) }))}
              current={statusToStep(loan.status as LoanStatus)}
              rejected={loan.status === "rejected"}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/applications/$id" params={{ id: loan.id }}>{t("common.view")}</Link>
            </Button>
            {loan.status === "approved" && (
              <Button asChild size="sm">
                <Link to="/pay/$id" params={{ id: loan.id }}>{t("dash.payFee")}</Link>
              </Button>
            )}
          </div>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-label uppercase tracking-wide">
          {t("dash.quick")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction to="/apply" icon={FilePlus2} label={t("dash.applyNew")} />
          <QuickAction to="/documents" icon={FolderOpen} label={t("dash.uploadDocs")} />
          <QuickAction to="/applications" icon={ListChecks} label={t("nav.applications")} />
          <QuickAction to="/repayments" icon={CreditCard} label={t("dash.viewRepay")} />
        </div>
      </div>
    </div>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-3 rounded-[20px] border border-border bg-surface p-5 text-center shadow-xs transition-all duration-150 hover:bg-elevated"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-label font-medium text-foreground">{label}</span>
    </Link>
  );
}
