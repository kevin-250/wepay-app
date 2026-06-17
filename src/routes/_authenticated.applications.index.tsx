import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FilePlus2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatRWF, formatDate, type LoanStatus } from "@/lib/loan";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/applications/")({
  head: () => ({ meta: [{ title: "My Applications — WePay" }] }),
  component: Applications,
});

function Applications() {
  const { t } = useI18n();
  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const { data } = await supabase.from("loans").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("nav.applications")}</h1>
        <Button asChild size="sm"><Link to="/apply"><FilePlus2 className="mr-2 h-4 w-4" />{t("dash.applyNew")}</Link></Button>
      </div>

      {isLoading ? (
        <Card className="h-40 animate-pulse" />
      ) : loans.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">{t("dash.noApp")}</Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("dash.appId")}</TableHead>
                <TableHead>{t("common.bank")}</TableHead>
                <TableHead>{t("common.amount")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.application_ref}</TableCell>
                  <TableCell>{l.bank}</TableCell>
                  <TableCell>{formatRWF(l.outstanding_balance)}</TableCell>
                  <TableCell><StatusBadge status={l.status as LoanStatus} /></TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(l.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm"><Link to="/applications/$id" params={{ id: l.id }}>{t("common.view")}</Link></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
