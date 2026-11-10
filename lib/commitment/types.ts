import type { Money } from "../money";

export type CommitmentShape = "one_time" | "recurring" | "financed";

/**
 * How often a repeating charge falls due. The arithmetic never depends on it —
 * `computeCommitment` multiplies the amount by the count either way — so a
 * yearly plan is stored as written rather than converted to months, which would
 * turn one $20 charge a year into twelve payments of $1.6666.
 */
export type BillingPeriod = "month" | "year";

/** A repeating charge: `count` periods of the same amount. */
export type Recurrence = {
  count: number;
  period: BillingPeriod;
};

/** A financed purchase: `count` instalments of the same amount. */
export type Installment = {
  count: number;
  amount: Money;
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
  /**
   * `null` means the source did not state this part — which is not the same as
   * stating zero. A listing that never mentions shipping has not said shipping
   * is free, so the totals built over these parts are floors, and the screen
   * says so.
   */
  shipping: Money | null;
  tax: Money | null;
  recurrence?: Recurrence;
  installment?: Installment;
  /**
   * A charge taken once when the commitment starts, on top of the first period:
   * an origination fee, a joining fee, a setup fee. It belongs to the shape's
   * terms either way, which is why it lives here rather than inside
   * `Installment` — PayPal holds it as one `setup_fee` on a plan, and a plan and
   * an instalment schedule can both have one.
   *
   * Absent means none was charged. It is deliberately *not* part of `unstated`:
   * the parts a checkout adds silently are shipping and tax, and a commitment
   * whose terms state a term usually states a fee when there is one.
   */
  openingFee?: Money;
  /**
   * What the plan does when a payment does not go through, when the terms say.
   *
   * Absent means nobody said — not that nothing happens. A PayPal plan carries
   * this as `payment_preferences.payment_failure_threshold`, and for a plan this
   * product creates it is a stated term like any other: the shopper is entitled
   * to know before agreeing, not to read a sentence saying we did not say.
   */
  failure?: FailureTerms;
  exit: ExitTerms;
}

/** What happens to a plan whose payment does not go through. */
export type FailureTerms = {
  /** Failed payments PayPal allows before it suspends the plan. */
  suspendAfter: number;
};

/** A part of the charge the source did not state. */
export type UnstatedPart = "shipping" | "tax";

export interface CommitmentBreakdown {
  item: Money;
  shipping: Money | null;
  tax: Money | null;
  /**
   * The opening fee, when there is one, so the three rows still add up to
   * today's charge. `null` here means no fee was charged — not that one is
   * unstated, which is why it does not share `shipping` and `tax`'s meaning.
   */
  fee: Money | null;
}

export interface CommitmentTranslation {
  /** Charged at the moment of consent. */
  today: Money;
  /** Every charge the commitment adds up to. */
  acrossTerm: Money;
  /**
   * What each repeat after today costs — the same as `today` when nothing is
   * charged once up front. It is the figure a "next charge" is, and the reason
   * it is computed here rather than at a render site is that two callers had
   * already written the same arithmetic twice.
   */
  perPeriod: Money;
  /** `null` means the seller has not published this. Never zero. */
  exit: Money | null;
  breakdown: CommitmentBreakdown;
  /**
   * The parts the totals could not include. Non-empty means `today` and
   * `acrossTerm` are floors — the sum of what was stated, not the whole charge —
   * and a screen that prints them as final is claiming something nobody said.
   */
  unstated: UnstatedPart[];
}
