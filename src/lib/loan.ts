export type LoanStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "fee_paid"
  | "verifying_payment"
  | "in_progress"
  | "completed";

export const STATUS_VARIANT: Record<LoanStatus, string> = {
  submitted: "bg-accent text-accent-foreground",
  under_review: "bg-warning/15 text-warning-foreground border border-warning/40",
  approved: "bg-success/15 text-success border border-success/40",
  rejected: "bg-destructive/10 text-destructive border border-destructive/40",
  fee_paid: "bg-accent text-accent-foreground",
  verifying_payment: "bg-warning/15 text-warning-foreground border border-warning/40",
  in_progress: "bg-primary/10 text-primary border border-primary/30",
  completed: "bg-success/15 text-success border border-success/40",
};

// Maps a loan status to the active step index (0-based) of the 5-step timeline.
export const TIMELINE_STEPS = [
  "status.submitted",
  "status.under_review",
  "status.approved",
  "status.fee_paid",
  "status.in_progress",
] as const;

export function statusToStep(status: LoanStatus): number {
  switch (status) {
    case "submitted":
      return 0;
    case "under_review":
      return 1;
    case "approved":
      return 2;
    case "rejected":
      return 1;
    case "fee_paid":
    case "verifying_payment":
      return 3;
    case "in_progress":
      return 4;
    case "completed":
      return 5;
    default:
      return 0;
  }
}

export function formatRWF(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(v);
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
