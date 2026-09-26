import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, Download, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/loan";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Documents — WePay" }] }),
  component: Documents,
});

function Documents() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState("");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const upload = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10MB limit.");
      return;
    }
    setBusy(true);
    try {
      const path = `${user.id}/general/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("wepay-documents").upload(path, file);
      if (error) throw error;
      await supabase.from("documents").insert({
        user_id: user.id,
        doc_type: docType || "other",
        file_path: path,
        file_name: file.name,
      });
      qc.invalidateQueries({ queryKey: ["documents", user.id] });
      toast.success("Document uploaded.");
      setDocType("");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const download = async (path: string) => {
    const { data, error } = await supabase.storage.from("wepay-documents").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Could not generate download link.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("docs.title")}</h1>

      <Card className="space-y-4 p-6">
        <div className="space-y-1.5">
          <Label>Document type</Label>
          <Input placeholder="e.g. Bank statement" value={docType} onChange={(e) => setDocType(e.target.value)} />
        </div>
        <label
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-accent/30 p-8 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-accent"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-primary" />}
          {t("docs.drop")}
          <input type="file" className="hidden" accept="image/*,.pdf" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
        </label>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("docs.uploaded")}</h2>
        {isLoading ? (
          <Card className="h-32 animate-pulse" />
        ) : docs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">No documents uploaded yet.</Card>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <Card key={d.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{d.file_name ?? d.doc_type}</p>
                    <p className="text-xs capitalize text-muted-foreground">{d.doc_type.replace(/_/g, " ")} · {formatDate(d.created_at)}</p>
                    {d.status === "rejected" && d.rejection_reason && (
                      <p className="text-xs text-destructive">{d.rejection_reason}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DocStatus status={d.status} />
                  <Button variant="ghost" size="icon" onClick={() => download(d.file_path)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DocStatus({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    verified: { cls: "text-success", icon: CheckCircle2, label: "Verified" },
    pending: { cls: "text-warning-foreground", icon: Clock, label: "Pending" },
    rejected: { cls: "text-destructive", icon: XCircle, label: "Rejected" },
  };
  const s = map[status] ?? map.pending;
  const Icon = s.icon;
  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", s.cls)}>
      <Icon className="h-4 w-4" /> {s.label}
    </span>
  );
}
