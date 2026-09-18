import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TermsViewer } from "@/components/TermsModal";
import { useI18n, type Lang } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — WePay" }] }),
  component: Settings,
});

function Settings() {
  const { t, lang, setLang } = useI18n();
  const { profile, user, isAdmin, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [notifyEmail, setNotifyEmail] = useState(profile?.notify_email ?? true);
  const [notifySms, setNotifySms] = useState(profile?.notify_sms ?? false);
  const [notifyInapp, setNotifyInapp] = useState(profile?.notify_inapp ?? true);
  const [newPass, setNewPass] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone,
          notify_email: notifyEmail,
          notify_sms: notifySms,
          notify_inapp: notifyInapp,
          language: lang,
        })
        .eq("user_id", user.id);
      await refreshProfile();
      toast.success("Settings saved.");
    } catch (err: any) {
      toast.error(err.message ?? "Could not save");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (newPass.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setSavingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      setNewPass("");
      toast.success("Password updated.");
    } catch (err: any) {
      toast.error(err.message ?? "Could not update password");
    } finally {
      setSavingPass(false);
    }
  };

  const signOutEverywhere = async () => {
    await supabase.auth.signOut({ scope: "global" });
    await signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>

      <Card className="space-y-4 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("settings.profile")}</h2>
        <div className="space-y-1.5">
          <Label>{t("auth.fullName")}</Label>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t("auth.phone")}</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("auth.email")}</Label>
            <Input value={profile?.email ?? user?.email ?? ""} disabled />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("settings.prefs")}</h2>
        <ToggleRow label={t("settings.notifyEmail")} checked={notifyEmail} onChange={setNotifyEmail} />
        <ToggleRow label={t("settings.notifySms")} checked={notifySms} onChange={setNotifySms} />
        <ToggleRow label={t("settings.notifyInapp")} checked={notifyInapp} onChange={setNotifyInapp} />
        <div className="space-y-1.5 pt-2">
          <Label>{t("settings.language")}</Label>
          <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
            <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="rw">Kinyarwanda</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={saveProfile} disabled={savingProfile}>
          {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("common.save")}
        </Button>
      </Card>

      {!isAdmin && (
        <Card className="space-y-4 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Legal
          </h2>
          <TermsViewer>
            <Button variant="outline">View Terms & Conditions</Button>
          </TermsViewer>
        </Card>
      )}

      <Card className="space-y-4 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("settings.security")}</h2>
        <div className="space-y-1.5">
          <Label>{t("settings.newPass")}</Label>
          <Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} className="max-w-sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={changePassword} disabled={savingPass}>
            {savingPass && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("settings.changePass")}
          </Button>
          <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={signOutEverywhere}>
            Sign out everywhere
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
