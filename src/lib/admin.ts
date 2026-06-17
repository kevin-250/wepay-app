import type { LoanStatus } from "@/lib/loan";

export type Loan = {
  id: string;
  user_id: string;
  application_ref: string;
  full_name: string | null;
  bank: string | null;
  account_number: string | null;
  original_amount: number | null;
  outstanding_balance: number | null;
  collateral_type: string | null;
  collateral_value: number | null;
  trust_fee: number | null;
  reason: string | null;
  status: LoanStatus;
  rejection_reason: string | null;
  amount_repaid: number | null;
  created_at: string;
  updated_at: string;
};

// How long (in days) an application may sit in a stage before it is "stuck".
export const STUCK_THRESHOLDS: Partial<Record<LoanStatus, number>> = {
  submitted: 3,
  under_review: 3,
  approved: 5,
  verifying_payment: 2,
};

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function isStuck(loan: Pick<Loan, "status" | "updated_at" | "created_at">): boolean {
  const threshold = STUCK_THRESHOLDS[loan.status];
  if (threshold == null) return false;
  return daysSince(loan.updated_at ?? loan.created_at) >= threshold;
}

// KPI alert thresholds for the monitoring panel.
export const KPI_THRESHOLDS = {
  rejectionRatePct: 30, // alert if rejection rate exceeds this
  pendingReview: 5, // alert if more than this many apps await review
  pendingVerifications: 5, // alert if more than this many payments/docs await verification
};
