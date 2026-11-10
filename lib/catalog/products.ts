import { money } from "../money.ts";
import { SUSPEND_AFTER_FAILED_PAYMENTS } from "../commitment/plan-policy.ts";
import type { CommitmentTerms } from "../commitment/types";

export type Product = {
  slug: string;
  name: string;
  /** Merchant copy, written the way a storefront writes it — including the
   *  ambiguity this product exists to translate. */
  description: string;
  terms: CommitmentTerms;
};

export const products: Product[] = [
  {
    slug: "noise-cancelling-headphones",
    name: "Noise-Cancelling Headphones",
    description:
      "Was $79.99 — now 40% off. Ships in two working days. Free returns within 30 days.",
    terms: {
      shape: "one_time",
      itemPrice: money(4799),
      shipping: money(695),
      tax: money(401),
      exit: { kind: "none" },
    },
  },
  {
    slug: "coffee-subscription",
    name: "Coffee Subscription",
    description:
      "Freshly roasted, $12.00 a bag, delivered every month. A 12-month term — cancel any time, no fee.",
    terms: {
      shape: "recurring",
      itemPrice: money(1200),
      shipping: money(0),
      tax: money(0),
      recurrence: { count: 12, period: "month" },
      // A plan this product creates, and this is how it is created: PayPal
      // suspends on the first failed payment, so the schedule says so before the
      // shopper agrees. The number is not written here — it is the one
      // `ensurePlan` sends — so the screen and the plan cannot disagree.
      failure: { suspendAfter: SUSPEND_AFTER_FAILED_PAYMENTS },
      // Unstated on purpose: the shop says "cancel any time, no fee" in its
      // description, and the entry's whole claim is that this figure is read out
      // of that sentence rather than written beside it (IPD 21). A structured
      // `$0.00` here would be a number we typed, under copy claiming we read it.
      exit: { kind: "unknown" },
    },
  },
  {
    slug: "mattress-financed",
    name: "Mattress — 12 Months",
    description:
      "0% APR over 12 months: 12 payments of $105.00, plus a $60.00 origination fee. 100-night trial. Cancellation terms not shown on this page.",
    terms: {
      shape: "financed",
      itemPrice: money(120000),
      shipping: money(0),
      tax: money(0),
      installment: { count: 12, amount: money(10500) },
      // The seller's word is "plus": the fee is taken once, on top of the twelve
      // instalments — which is how PayPal will collect it, as the plan's
      // `setup_fee`. So it is in today's charge ($105.00 + $60.00 = $165.00) and
      // in the term total exactly once ($1,320.00).
      openingFee: money(6000),
      // The instalments are a PayPal plan like the subscription above, so the
      // same policy applies and is stated in the same sentence.
      failure: { suspendAfter: SUSPEND_AFTER_FAILED_PAYMENTS },
      exit: { kind: "unknown" },
    },
  },
];

export function findProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}
