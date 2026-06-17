import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — WePay Rwanda" },
      { name: "description", content: "Log in or create your WePay account to apply for and track debt refinancing in Rwanda." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "register" | "forgot";

function AuthPage() {
  const { t } = useI18n();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [nid, setNid] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [session, loading, navigate]);

  // Resolve a login identifier (phone or national ID) to its email via profiles.
  const resolveEmail = async (id: string): Promise<string | null> => {
    if (id.includes("@")) return id;
    const col = id.startsWith("+") || /^\d{7,}$/.test(id) ? "phone" : "national_id";
    const { data } = await supabase.from("profiles").select("email").eq(col, id).maybeSingle();
    return data?.email ?? null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const loginEmail = await resolveEmail(identifier.trim());
      if (!loginEmail) {
        toast.error("No account found for that identifier.");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) throw error;
      toast.success(t("auth.welcomeBack"));
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: fullName, national_id: nid, phone },
        },
      });
      if (error) throw error;
      
      if (data?.session) {
        toast.success("Account created! Logging you in...");
        navigate({ to: "/dashboard" });
      } else {
        toast.success("Account created! You can now log in.");
        setMode("login");
        setIdentifier(email);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth`,
      });
      toast.success(t("auth.resetSent"));
      setMode("login");
    } catch (err: any) {
      toast.error(err.message ?? "Could not send reset email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Logo light />
        <div className="space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight">
            Refinance your loan, online and on your terms.
          </h1>
          <p className="max-w-md text-primary-foreground/80">
            WePay helps Rwandan citizens restructure existing bank loans into manageable financing
            backed by collateral — without visiting an office.
          </p>
          <ul className="space-y-3 text-sm">
            {["Apply in minutes with a guided wizard", "Track every step to repayment", "Secure document storage"].map(
              (f) => (
                <li key={f} className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" /> {f}
                </li>
              ),
            )}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">© WePay Rwanda Ltd</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md p-8">
          <div className="mb-6 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {mode === "login" ? t("auth.welcomeBack") : mode === "register" ? t("auth.createTitle") : t("auth.reset")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login"
              ? "Log in with your email, phone, or National ID."
              : mode === "register"
                ? "Join WePay to start your refinancing journey."
                : "Enter your email to receive a reset link."}
          </p>

          {mode === "login" && (
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="identifier">{t("auth.identifier")}</Label>
                <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button type="button" onClick={() => setMode("forgot")} className="text-sm font-medium text-primary hover:underline">
                {t("auth.forgot")}
              </button>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("auth.login")}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t("auth.noAccount")}{" "}
                <button type="button" onClick={() => setMode("register")} className="font-semibold text-primary hover:underline">
                  {t("auth.signupCta")}
                </button>
              </p>
            </form>
          )}

          {mode === "register" && (
            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nid">{t("auth.nid")}</Label>
                  <Input id="nid" value={nid} onChange={(e) => setNid(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t("auth.phone")}</Label>
                  <Input id="phone" placeholder="+250..." value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rpassword">{t("auth.password")}</Label>
                <Input id="rpassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("auth.register")}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t("auth.haveAccount")}{" "}
                <button type="button" onClick={() => setMode("login")} className="font-semibold text-primary hover:underline">
                  {t("auth.loginCta")}
                </button>
              </p>
            </form>
          )}

          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="femail">{t("auth.email")}</Label>
                <Input id="femail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t("auth.reset")}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <button type="button" onClick={() => setMode("login")} className="font-semibold text-primary hover:underline">
                  {t("auth.loginCta")}
                </button>
              </p>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
