import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Send, Mail, Phone, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support — WePay" }] }),
  component: Support,
});

const FAQS = [
  { q: "What is the 5% trust fee?", a: "The trust fee is 5% of your outstanding debt, paid once your application is approved. It secures the refinancing arrangement before WePay clears your original bank loan." },
  { q: "How long does approval take?", a: "Applications are typically reviewed within 2–3 business days after submission and document verification." },
  { q: "What collateral is accepted?", a: "We accept houses, land, and vehicles. You must provide a valid title or ownership document for the collateral." },
  { q: "When is my collateral released?", a: "Your collateral is released once all repayment installments are fully settled." },
];

function Support() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const send = async () => {
    if (!body.trim() || !user) return;
    const text = body.trim();
    setBody("");
    await supabase.from("messages").insert({ user_id: user.id, sender: "user", body: text });
    qc.invalidateQueries({ queryKey: ["messages", user.id] });
    toast.success("Message sent to support.");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("support.title")}</h1>

      <Card className="flex h-[420px] flex-col p-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">
              Start a conversation with our support team.
            </p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={cn("flex", m.sender === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                    m.sender === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-secondary text-secondary-foreground",
                  )}
                >
                  {m.body}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-2 border-t border-border p-3">
          <Input
            placeholder={t("support.placeholder")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <Button size="icon" onClick={send}><Send className="h-4 w-4" /></Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <HelpCircle className="h-4 w-4" /> {t("support.faq")}
        </h2>
        <Accordion type="single" collapsible>
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>

      <Card className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium text-foreground">support@wepay.rw</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Phone className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="text-sm font-medium text-foreground">+250 788 000 000</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
