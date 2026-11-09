import { money } from "../money.ts";
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
      installment: { count: 12, amount: money(10500), fee: money(6000) },
      exit: { kind: "unknown" },
    },
  },
];

export function findProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}
