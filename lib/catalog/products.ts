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

/**
 * Products this repository writes down itself.
 *
 * The one-time entry stays because it is a complete set of terms for a shape
 * the shop already handles; the recurring entries that used to live here were
 * invented prices and terms, and were deleted once real subscriptions could be
 * read from the catalogue (`lib/market/subscriptions.ts`). A new term entry
 * here would be a number someone typed, which is the thing this product exists
 * not to do.
 */
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
];

export function findProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}
