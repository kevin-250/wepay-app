import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldOff, UserCog, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Role Management — WePay" }] }),
  component: UserRoles,
});

const ROLES = ["admin", "user"] as const;
type AppRole = (typeof ROLES)[number];

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};
type RoleRow = { user_id: string; role: AppRole };

function UserRoles() {
  const { isAdmin, loading, user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [isAdmin, loading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email, phone"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;
      const byUser = new Map<string, AppRole[]>();
      (roles as RoleRow[]).forEach((r) => {
        byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]);
      });
      return (profiles as ProfileRow[]).map((p) => ({
        ...p,
        roles: byUser.get(p.user_id) ?? [],
      }));
    },
  });

  const grant = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role granted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const revoke = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role removed");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  if (loading || !isAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCog className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Role Management</h1>
          <p className="text-sm text-muted-foreground">View users and manage their roles.</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading users…
          </div>
        ) : !data || data.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No users found.</div>
        ) : (
          <div className="divide-y divide-border">
            {data.map((u) => {
              const available = ROLES.filter((r) => !u.roles.includes(r));
              const isSelf = u.user_id === user?.id;
              return (
                <div
                  key={u.user_id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{u.full_name ?? "Unnamed user"}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {u.email ?? u.phone ?? u.user_id}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {u.roles.length === 0 && (
                      <span className="text-xs text-muted-foreground">No roles</span>
                    )}
                    {u.roles.map((r) => (
                      <Badge
                        key={r}
                        variant={r === "admin" ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {r === "admin" ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : (
                          <ShieldOff className="h-3 w-3" />
                        )}
                        {r}
                        {!(isSelf && r === "admin") && (
                          <button
                            aria-label={`Remove ${r}`}
                            className="ml-0.5 rounded-full hover:bg-black/10"
                            onClick={() => revoke.mutate({ userId: u.user_id, role: r })}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                    {available.length > 0 && (
                      <Select
                        onValueChange={(v) =>
                          grant.mutate({ userId: u.user_id, role: v as AppRole })
                        }
                        value=""
                      >
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue placeholder="Add role" />
                        </SelectTrigger>
                        <SelectContent>
                          {available.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
