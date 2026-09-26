import { useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const TERMS_TEXT = `
Terms & Conditions — WePay

[Placeholder text — replace with the real legal terms before launch.]

1. Eligibility
You must be at least 18 years old and hold an active loan with a participating bank to apply for refinancing through WePay.

2. How Refinancing Works
WePay may pay off your existing bank debt on your behalf. In exchange, you agree to repay WePay under the terms set out in your approved application, including any applicable interest and fees.

3. Application Review
All applications are subject to review and verification by WePay. WePay may request additional documents or collateral information and may approve, reject, or request changes to any application at its discretion.

4. Repayment Obligations
You are responsible for making repayments according to the schedule agreed upon approval. Late or missed payments may result in fees, penalties, or other consequences as described in your repayment agreement.

5. Data & Documents
By using WePay you consent to WePay collecting, storing, and verifying the personal and financial documents you submit, including national ID, proof of income, and collateral documentation.

6. Changes to These Terms
WePay may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms.

7. Contact
For questions about these terms, contact WePay support through the in-app support screen.


`;

// Read-only viewer for Settings — no Accept/Decline, just for re-reading the terms.
export function TermsViewer({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Terms & Conditions</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-72 rounded-md border p-4 text-sm text-muted-foreground">
          <div className="whitespace-pre-line">{TERMS_TEXT}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function TermsModal() {
  const { user, profile, isAdmin, loading, refreshProfile, signOut } = useAuth();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Never show for admins, while auth is still loading, or once already accepted.
  const shouldShow = !loading && !!user && !isAdmin && !!profile && !profile.accepted_terms;

  if (!shouldShow) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // ScrollArea's actual scrolling element is the Radix Viewport (the real
    // event target), not the Root the listener is attached to.
    const el = e.target as HTMLDivElement;
    if (typeof el.scrollHeight !== "number") return;
    const reachedBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
    if (reachedBottom) setScrolledToBottom(true);
  };

  const handleAccept = async () => {
    if (!user || !scrolledToBottom) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({ accepted_terms: true, accepted_terms_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't save your acceptance. Please try again.");
      return;
    }
    await refreshProfile();
  };

  const handleDecline = async () => {
    setDeclineOpen(false);
    await signOut();
  };

  return (
    <>
      <Dialog open={shouldShow}>
        <DialogPortal>
          <DialogOverlay />
          <DialogPrimitive.Content
            className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-elevated p-6 shadow-2xl sm:rounded-lg"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Terms & Conditions</DialogTitle>
            </DialogHeader>

            <ScrollArea
              className="h-72 rounded-md border p-4 text-sm text-muted-foreground"
              onScrollCapture={handleScroll}
            >
              <div ref={viewportRef} className="whitespace-pre-line">
                {TERMS_TEXT}
              </div>
            </ScrollArea>

            {!scrolledToBottom && (
              <p className="text-xs text-muted-foreground">
                Scroll to the bottom to enable "Accept".
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeclineOpen(true)} disabled={submitting}>
                Decline
              </Button>
              <Button onClick={handleAccept} disabled={!scrolledToBottom || submitting}>
                {submitting ? "Saving..." : "Accept"}
              </Button>
            </DialogFooter>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      <AlertDialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline Terms & Conditions?</AlertDialogTitle>
            <AlertDialogDescription>
              You must accept the Terms & Conditions to use WePay. If you decline, you'll be signed
              out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={handleDecline}>Decline & sign out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
