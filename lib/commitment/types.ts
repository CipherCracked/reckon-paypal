import type { Money } from "../money";

export type CommitmentShape = "one_time" | "recurring" | "financed";

export type BillingPeriod = "month";

/** A repeating charge: `count` periods of the same amount. */
export type Recurrence = {
  count: number;
  period: BillingPeriod;
};

/** A financed purchase: `count` instalments plus any financing fee. */
export type Installment = {
  count: number;
  amount: Money;
  fee: Money;
};

/**
 * What it costs to leave. `unknown` is its own case, not zero: an unpublished
 * cancellation term must never read as "free to cancel".
 */
export type ExitTerms =
  | { kind: "none" }
  | { kind: "fee"; fee: Money }
  | { kind: "unknown" };

export interface CommitmentTerms {
  shape: CommitmentShape;
  itemPrice: Money;
  shipping: Money;
  tax: Money;
  recurrence?: Recurrence;
  installment?: Installment;
  exit: ExitTerms;
}

export interface CommitmentBreakdown {
  item: Money;
  shipping: Money;
  tax: Money;
}

export interface CommitmentTranslation {
  /** Charged at the moment of consent. */
  today: Money;
  /** Every charge the commitment adds up to. */
  acrossTerm: Money;
  /** `null` means the seller has not published this. Never zero. */
  exit: Money | null;
  breakdown: CommitmentBreakdown;
}
