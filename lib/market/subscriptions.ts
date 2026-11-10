import { SUSPEND_AFTER_FAILED_PAYMENTS } from "@/lib/commitment/plan-policy";
import type { BillingPeriod, CommitmentTerms } from "@/lib/commitment/types";
import type { MarketOffer } from "./channel3";

/**
 * The term a retail listing states, read out of that listing's own words.
 *
 * The catalogue has no field for a cadence, a term length, a cancellation rule
 * or a fee, so those facts cannot be parsed from it. What a merchant does
 * publish is a sentence saying what the plan is — "a 6 month BarkBox plan" —
 * and that sentence is the only honest source a term can come from. The map is
 * keyed by the catalogue's product id, and each entry carries the span it was
 * read from so the screen can print the merchant's words rather than ours.
 *
 * Only listings that state a number of months are here. A box that repeats
 * forever without a stated term cannot be turned into a schedule with an end,
 * and a quarterly one cannot be written as `month` or `year` without changing
 * what the merchant said.
 */
export type ListedTerm = {
  readonly count: number;
  readonly period: BillingPeriod;
  /** A verbatim substring of the listing's title or description. */
  readonly quote: string;
};

export const LISTED_TERMS: Readonly<Record<string, ListedTerm>> = {
  // "This listing is for a 6 month BarkBox plan…" and "…delivers … each month."
  YyLUjLT: { count: 6, period: "month", quote: "6 month BarkBox plan" },
  // The Detox Box's title is "The Detox Box 6-Month Subscription", and its
  // description calls the box monthly.
  omHxx9v: { count: 6, period: "month", quote: "6-Month Subscription" },
  // The title is "BARK 3 Month Subscription".
  DAaHyQc: { count: 3, period: "month", quote: "3 Month Subscription" },
  // "A 12-month BarkBox subscription … featuring monthly BarkBox dog toys…"
  zHpJR9Q: { count: 12, period: "month", quote: "12-month BarkBox subscription" },
};

export function curatedTerm(productId: string): ListedTerm | undefined {
  return LISTED_TERMS[productId];
}

/**
 * Whether the listing still says the words the term was read from.
 *
 * A curated id is not a licence to keep quoting a sentence the merchant has
 * since removed. Resolution checks this against the record it just read, so a
 * rewritten description stops being a quote and the page can say the term is no
 * longer stated rather than printing last week's sentence as today's.
 */
export function termIsStated(
  record: { title: string; description: string },
  term: ListedTerm,
): boolean {
  return `${record.title}\n${record.description}`.includes(term.quote);
}

/**
 * The terms a listed subscription supports: the live offer's price, repeated
 * for the term the merchant states, with the parts the catalogue does not carry
 * left absent.
 *
 * Shipping and tax are `null`, never zero: the offer says neither, and a
 * retailer that has not mentioned shipping has not said shipping is free.
 *
 * The exit is `unknown` on purpose. The shop cannot name a cancellation fee,
 * but the merchant's description might, and leaving the term unresolved is what
 * lets `readPublishedExit` read that sentence and report "not stated" when
 * there is nothing.
 */
export function subscriptionTerms(offer: MarketOffer, term: ListedTerm): CommitmentTerms {
  return {
    shape: "recurring",
    itemPrice: offer.price,
    shipping: null,
    tax: null,
    recurrence: { count: term.count, period: term.period },
    // The same number `ensurePlan` sends to PayPal, so the schedule the shopper
    // reads before agreeing cannot differ from the plan that is created.
    failure: { suspendAfter: SUSPEND_AFTER_FAILED_PAYMENTS },
    exit: { kind: "unknown" },
  };
}
