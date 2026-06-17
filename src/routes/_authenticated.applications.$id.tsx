import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Timeline } from "@/components/Timeline";
import { TIMELINE_STEPS, statusToStep, formatRWF, formatDate, type LoanStatus } from "@/lib/loan";

export const Route = createFileRoute("/_authenticated/applications/$id")({
  head: () => ({ meta: [{ title: "Application Detail — WePay" }] }),
  component: ApplicationDetail,
});

function ApplicationDetail() {
  const { t } = useI18n();
  const { id } = useParams({ from: "/_authenticated/applications/$id" });

  const { data: loan, isLoading } = useQuery({
    queryKey: ["loan", id],
    queryFn: async () => {
      const { data } = await supabase.from("loans").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  if (isLoading) return <Card className="h-64 animate-pulse" />;
  if (!loan) return <Card className="p-10 text-center text-muted-foreground">Application not found.</Card>;

  const status = loan.status as LoanStatus;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/applications"><ArrowLeft className="mr-2 h-4 w-4" />{t("nav.applications")}</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-2xl font-bold text-foreground">{loan.application_ref}</h1>
          <p className="text-sm text-muted-foreground">{loan.bank} · {formatDate(loan.created_at)}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {status === "rejected" && (
        <Banner tone="destructive" icon={AlertCircle} title="Application Rejected">
          {loan.rejection_reason ?? "Your application did not meet the requirements."}{" "}
          <Link to="/apply" className="font-semibold underline">Re-apply</Link>
        </Banner>
      )}
      {status === "under_review" && (
        <Banner tone="warning" icon={Clock} title="Under Review">
          Applications are typically reviewed within 2–3 business days.
        </Banner>
      )}
      {status === "approved" && (
        <Banner tone="success" icon={CheckCircle2} title="Approved!">
          Your application is approved. Proceed to pay the 5% trust fee to continue.
          <div className="mt-3">
            <Button asChild size="sm"><Link to="/pay/$id" params={{ id: loan.id }}>{t("fee.title")}</Link></Button>
          </div>
        </Banner>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Progress</h2>
          <Timeline
            steps={TIMELINE_STEPS.map((k) => ({ label: t(k) }))}
            current={statusToStep(status)}
            orientation="vertical"
            rejected={status === "rejected"}
          />
        </Card>

        <Card className="space-y-3 p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Details</h2>
          <Row label={t("wizard.originalAmount")} value={formatRWF(loan.original_amount)} />
          <Row label={t("wizard.outstanding")} value={formatRWF(loan.outstanding_balance)} />
          <Row label={t("fee.trustFee")} value={formatRWF(loan.trust_fee)} />
          <Row label={t("wizard.accountNumber")} value={loan.account_number ?? "—"} />
          <Row label={t("wizard.collType")} value={loan.collateral_type ?? "—"} />
          <Row label={t("wizard.collValue")} value={formatRWF(loan.collateral_value)} />
          {loan.reason && <Row label={t("wizard.reason")} value={loan.reason} />}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function Banner({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: "destructive" | "warning" | "success";
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  const tones = {
    destructive: "border-destructive/40 bg-destructive/10 text-destructive",
    warning: "border-warning/40 bg-warning/10 text-warning-foreground",
    success: "border-success/40 bg-success/10 text-success",
  };
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold">{title}</p>
          <div className="mt-1 text-foreground/90">{children}</div>
        </div>
      </div>
    </div>
  );
}
