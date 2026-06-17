import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FilePlus2,
  ListChecks,
  CreditCard,
  FolderOpen,
  Bell,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  UserCog,
  FileCheck2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useI18n, type Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, key: "nav.dashboard" },
  { to: "/apply", icon: FilePlus2, key: "nav.apply" },
  { to: "/applications", icon: ListChecks, key: "nav.applications" },
  { to: "/repayments", icon: CreditCard, key: "nav.repayments" },
  { to: "/documents", icon: FolderOpen, key: "nav.documents" },
  { to: "/notifications", icon: Bell, key: "nav.notifications" },
  { to: "/support", icon: MessageSquare, key: "nav.support" },
  { to: "/settings", icon: Settings, key: "nav.settings" },
] as const;

const ADMIN_NAV = [
  { to: "/admin", icon: LayoutDashboard, key: "nav.adminConsole" },
  { to: "/admin/applications", icon: FileCheck2, key: "nav.adminApps" },
  { to: "/admin/verifications", icon: ShieldCheck, key: "nav.adminVerify" },
  { to: "/users", icon: UserCog, key: "nav.users" },
  { to: "/notifications", icon: Bell, key: "nav.notifications" },
  { to: "/settings", icon: Settings, key: "nav.settings" },
] as const;

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "ENG" },
  { code: "rw", label: "RW" },
  { code: "fr", label: "FR" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems = isAdmin ? ADMIN_NAV : NAV;

  const { data: unread = 0 } = useQuery({
    queryKey: ["unread-notifs", user?.id],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("read", false);
      return count ?? 0;
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  const NavItems = () => (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {navItems.map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md border-l-4 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-accent text-accent-foreground"
                : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span className="flex-1">{t(item.key)}</span>
            {item.key === "nav.notifications" && unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between bg-primary px-4 text-primary-foreground shadow-sm">
        <div className="flex items-center gap-3">
          <button
            className="rounded-md p-1.5 hover:bg-white/10 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Logo light />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-md bg-white/10 p-0.5 text-xs">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={cn(
                  "rounded px-2 py-1 font-semibold transition-colors",
                  lang === l.code ? "bg-white text-primary" : "text-white/80 hover:text-white",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <span className="hidden text-sm font-medium sm:block">
            {profile?.full_name ?? user?.email}
          </span>
        </div>
      </header>

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 top-16 hidden w-[260px] flex-col border-r border-border bg-sidebar lg:flex">
        <NavItems />
        <div className="border-t border-border p-3">
          <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> {t("nav.signout")}
          </Button>
        </div>
      </aside>

      {/* Sidebar (mobile) */}
      {open && (
        <div className="fixed inset-0 top-16 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[260px] flex-col bg-sidebar">
            <NavItems />
            <div className="border-t border-border p-3">
              <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> {t("nav.signout")}
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="px-4 pb-12 pt-20 sm:px-6 lg:pl-[284px] lg:pr-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
