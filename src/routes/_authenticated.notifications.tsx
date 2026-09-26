import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/loan";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — WePay" }] }),
  component: Notifications,
});

function Notifications() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const markRead = async (id: string) => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("id", id).eq("user_id", user.id);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
    qc.invalidateQueries({ queryKey: ["unread-notifs", user.id] });
  };

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("read", false).eq("user_id", user.id);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
    qc.invalidateQueries({ queryKey: ["unread-notifs", user.id] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("notif.title")}</h1>
        {items.some((i) => !i.read) && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <CheckCheck className="mr-2 h-4 w-4" />{t("notif.markAll")}
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card className="h-32 animate-pulse" />
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">{t("notif.empty")}</Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={cn(
                "flex cursor-pointer items-start gap-3 p-4 transition-colors",
                !n.read && "border-primary/30 bg-accent",
              )}
            >
              <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", n.read ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground")}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{n.title}</p>
                  {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </div>
                {n.message && <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(n.created_at)}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
